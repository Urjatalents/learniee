import { logActivity } from "@/features/shared/server/activityLog.service";
import { createCycleSessions } from "@/features/shared/server/classSession.service";
import { generateInvoiceForPayment } from "@/features/shared/server/invoice.service";
import { notifyCycleRenewed } from "@/features/shared/server/notificationTriggers.service";
import { buildCyclePlan, priceForSessions } from "@/features/shared/utils/cyclePlan";
import {
    isInternationalParent,
    priceWithInternationalSurcharge,
} from "@/lib/internationalPayments";
import {
    calendarDateToDate
} from "@/lib/platformTime";
import { prisma } from "@/lib/prisma";
import {
    getRazorpayClient,
    rupeesToPaise,
    verifyCheckoutSignature
} from "@/lib/razorpay";
import {
    CycleStatus,
    EnrollmentStatus,
    InvoiceType,
} from "@prisma/client";
import "server-only";
import { VerifyRenewalPaymentInput } from './order';
import { RenewalError, loadRenewableEnrollment } from './plan';

export async function verifyRenewalPayment(
  enrollmentId: string,
  parentId: string,
  input: VerifyRenewalPaymentInput,
) {
  // Idempotent on the order id, same pattern as verifyEnrollmentPayment.
  const existingInvoice = await prisma.invoice.findUnique({
    where: { razorpayOrderId: input.razorpayOrderId },
  });

  if (existingInvoice) {
    const cycle = await prisma.enrollmentCycle.findFirst({
      where: { enrollmentId, paymentReference: input.razorpayPaymentId },
    });
    return { cycle };
  }

  const signatureOk = verifyCheckoutSignature({
    orderId: input.razorpayOrderId,
    paymentId: input.razorpayPaymentId,
    signature: input.razorpaySignature,
  });

  if (!signatureOk) {
    throw new RenewalError(
      "Payment verification failed. If money was deducted, it will be auto-refunded — contact support if it isn't reversed within a few days.",
      400,
    );
  }

  const razorpay = getRazorpayClient();
  const order = await razorpay.orders.fetch(input.razorpayOrderId);

  if (order.status !== "paid") {
    throw new RenewalError(
      `Payment isn't complete yet (status: ${order.status}). Please retry the payment.`,
      402,
    );
  }

  const notes = (order.notes ?? {}) as Record<string, unknown>;

  if (notes.kind !== "cycle_renewal" || String(notes.enrollmentId) !== enrollmentId) {
    throw new RenewalError("This payment doesn't match this enrollment's renewal.", 409);
  }

  if (notes.parentId && String(notes.parentId) !== parentId) {
    throw new RenewalError("This payment belongs to another account.", 403);
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

  const cycle = await prisma.$transaction(
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
          paymentReference: input.razorpayPaymentId,
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
      razorpayOrderId: input.razorpayOrderId,
      razorpayPaymentId: input.razorpayPaymentId,
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

  return { cycle };
}
