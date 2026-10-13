import { logActivity } from "@/features/shared/server/activityLog.service";
import { createCycleSessions } from "@/features/shared/server/classSession.service";
import { generateInvoiceForPayment } from "@/features/shared/server/invoice.service";
import { notifyCycleRenewed } from "@/features/shared/server/notificationTriggers.service";
import { buildCyclePlan, priceForSessions } from "@/features/shared/utils/cyclePlan";
import {
    isInternationalParent,
    priceWithInternationalSurcharge,
} from "@/lib/internationalPayments";
import { calendarDateToDate } from "@/lib/platformTime";
import { prisma } from "@/lib/prisma";
import { getRazorpayClient, rupeesToPaise } from "@/lib/razorpay";
import {
    CycleStatus,
    EnrollmentStatus,
    InvoiceType,
    Prisma,
} from "@prisma/client";
import "server-only";
import { RenewalError, loadRenewableEnrollment } from './plan';

type RazorpayOrder = Awaited<
  ReturnType<ReturnType<typeof getRazorpayClient>["orders"]["fetch"]>
>;

/**
 * The cycle a given Razorpay payment already paid for, if any. This is
 * the idempotency key for renewals: one captured payment can only ever
 * produce one `EnrollmentCycle`, no matter whether `/renew/verify`, the
 * Razorpay webhook, or both (they routinely race) get to it first.
 */
export async function findCycleForPayment(paymentId: string) {
  return prisma.enrollmentCycle.findFirst({
    where: { paymentReference: paymentId },
  });
}

function isUniqueViolation(err: unknown) {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

/**
 * Turns a PAID `cycle_renewal` Razorpay order into the next
 * `EnrollmentCycle` (+ its sessions, invoice, notification).
 *
 * Single implementation shared by `verifyRenewalPayment()` (browser
 * confirmed the payment) and `reconcileRenewalFromWebhook()` (browser
 * never came back). The caller has already proven the payment is real
 * — the checkout signature for /verify, the webhook signature for the
 * webhook — and that `order.status === "paid"`. Everything else is
 * re-derived here from the order's own notes, never from client input.
 *
 * Idempotent on `paymentId`: if a cycle already exists for this
 * payment, it's returned untouched (`created: false`). Safe under a
 * /verify-vs-webhook race — the loser of the
 * `(enrollmentId, cycleNumber)` unique constraint re-reads the
 * winner's cycle instead of failing.
 *
 * Throws `RenewalError` when the payment can't be applied (enrollment
 * ended, moved on, amount drifted) — those need a human/refund.
 */
export async function applyPaidRenewal(args: {
  order: RazorpayOrder;
  paymentId: string;
  /** Expected owner. /verify passes the logged-in parent; the webhook passes `notes.parentId`. */
  parentId: string;
  /** If set, the order must be for exactly this enrollment (/verify's URL param). */
  enrollmentId?: string;
}) {
  const { order, paymentId, parentId } = args;
  const notes = (order.notes ?? {}) as Record<string, unknown>;
  const enrollmentId = String(notes.enrollmentId ?? "");

  if (
    notes.kind !== "cycle_renewal" ||
    !enrollmentId ||
    (args.enrollmentId && enrollmentId !== args.enrollmentId)
  ) {
    throw new RenewalError("This payment doesn't match this enrollment's renewal.", 409);
  }

  if (notes.parentId && String(notes.parentId) !== parentId) {
    throw new RenewalError("This payment belongs to another account.", 403);
  }

  const existingCycle = await findCycleForPayment(paymentId);

  if (existingCycle) {
    return { cycle: existingCycle, created: false };
  }

  // The order's own notes are the source of truth for the schedule
  // that was priced and charged — never the client's resent body.
  const scheduleDays = JSON.parse(String(notes.scheduleDays ?? "[]")) as number[];
  const scheduleTime = String(notes.scheduleTime ?? "");
  const cycleNumber = Number(notes.cycleNumber);

  const { enrollment, latestCycle } = await loadRenewableEnrollment(enrollmentId, parentId);

  if (latestCycle.cycleNumber + 1 !== cycleNumber) {
    throw new RenewalError(
      "This enrollment has moved on since this payment was started — contact support with your payment ID.",
      409,
    );
  }

  const ratePerSession = Number(enrollment.ratePerSession);
  const totalAmount = priceForSessions(ratePerSession, Number(notes.sessionCount));

  const { amountPayable } = priceWithInternationalSurcharge(
    totalAmount,
    enrollment.parent ? isInternationalParent(enrollment.parent) : false,
  );

  if (Number(order.amount) !== rupeesToPaise(amountPayable)) {
    throw new RenewalError(
      "The paid amount no longer matches this enrollment's current rate — contact support with your payment ID for a refund.",
      409,
    );
  }

  const startDate = new Date(String(notes.cycleStartDate));
  const plan = buildCyclePlan(
    String(notes.cycleStartDate),
    scheduleDays,
    enrollment.planType,
  );

  if (!plan) {
    throw new RenewalError("Couldn't rebuild this renewal's cycle — contact support.", 500);
  }

  let cycle;

  try {
    cycle = await prisma.$transaction(
      async (tx) => {
        const created = await tx.enrollmentCycle.create({
          data: {
            enrollmentId,
            cycleNumber,
            startDate,
            endDate: calendarDateToDate(plan.endDate),
            sessionCount: plan.sessionCount,
            ratePerSession: enrollment.ratePerSession,
            price: totalAmount,
            paymentReference: paymentId,
            status: CycleStatus.OPEN,
          },
        });

        const stillActive = await tx.enrollment.updateMany({
          // Conditional on ACTIVE: if `completeEnrollmentIfNoRenewal`
          // won a race and already flipped this Enrollment to
          // COMPLETED between the check above and here, this rolls the
          // whole renewal back rather than leaving a COMPLETED
          // Enrollment with a freshly-paid next cycle sitting under it.
          where: { id: enrollmentId, status: EnrollmentStatus.ACTIVE },
          data: {
            scheduleDays,
            scheduleTime,
            sessionsPerMonth: plan.sessionCount,
            monthlyRate: totalAmount,
            totalAmount,
            dueDate: calendarDateToDate(plan.nextCycleStart),
            // A fresh due-date reminder for the *new* dueDate — see
            // dueDateReminder.service.ts's own comment anticipating this.
            dueDateReminderSentAt: null,
          },
        });

        if (stillActive.count === 0) {
          throw new RenewalError(
            "This enrollment ended before the renewal could finish — contact support with your payment ID.",
            409,
          );
        }

        await createCycleSessions(tx, enrollmentId, cycleNumber);

        return created;
      },
      { timeout: 15_000 },
    );
  } catch (err) {
    // Lost the race to a concurrent /verify or webhook call for the
    // same payment: its cycle is the one that counts.
    if (isUniqueViolation(err)) {
      const winner = await findCycleForPayment(paymentId);

      if (winner) {
        return { cycle: winner, created: false };
      }

      // Unique violation but not for this payment: the next cycle was
      // already bought with a DIFFERENT payment (a double payment).
      throw new RenewalError(
        "This enrollment was already renewed with another payment — contact support with your payment ID for a refund.",
        409,
      );
    }

    throw err;
  }

  try {
    await generateInvoiceForPayment({
      type: InvoiceType.CYCLE_RENEWAL_PAYMENT,
      payerId: parentId,
      amount: amountPayable,
      description: `Cycle ${cycleNumber} renewal${
        enrollment.subject ? ` — ${enrollment.subject}` : ""
      }`,
      referenceType: "ENROLLMENT_CYCLE",
      referenceId: cycle.id,
      razorpayOrderId: order.id,
      razorpayPaymentId: paymentId,
    });
  } catch (err) {
    console.error("Renewal invoice generation failed (renewal still succeeded):", err);
  }

  try {
    await notifyCycleRenewed(enrollmentId, cycleNumber);

    await logActivity({
      action: "CYCLE_RENEWED",
      actorRole: "PARENT",
      actorId: parentId,
      description: `Enrollment ${enrollmentId} renewed for cycle ${cycleNumber} (${plan.sessionCount} sessions).`,
      metadata: { enrollmentId, cycleNumber, sessionCount: plan.sessionCount },
    });
  } catch (err) {
    console.error("Post-renewal notify/log failed (renewal still succeeded):", err);
  }

  return { cycle, created: true };
}
