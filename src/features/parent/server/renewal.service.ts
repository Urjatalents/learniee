import "server-only";

import { prisma } from "@/lib/prisma";
import {
  CycleStatus,
  EnrollmentStatus,
  InvoiceType,
} from "@prisma/client";

import {
  getRazorpayClient,
  getRazorpayKeyId,
  rupeesToPaise,
  verifyCheckoutSignature,
} from "@/lib/razorpay";
import {
  isInternationalParent,
  priceWithInternationalSurcharge,
} from "@/lib/internationalPayments";
import {
  addDays,
  calendarDateToDate,
  compareDates,
  dateToCalendarDate,
  isValidTimeOfDay,
  toDateKey,
  todayInPlatformTz,
  type CalendarDate,
} from "@/lib/platformTime";
import { buildCyclePlan, getCyclePlanProblem, priceForSessions } from "@/features/shared/utils/cyclePlan";
import { SESSION_POLICY } from "@/lib/platformConfig";
import { createCycleSessions } from "@/features/shared/server/classSession.service";
import { generateInvoiceForPayment } from "@/features/shared/server/invoice.service";
import { notifyCycleRenewed } from "@/features/shared/server/notificationTriggers.service";
import { logActivity } from "@/features/shared/server/activityLog.service";

/**
 * Money and Renewal, Part 2B §2 — a cycle-model Enrollment only
 * keeps going because the parent renews it, one month at a time. No
 * re-approval: renewal reuses the schedule/rate already approved for
 * this Enrollment (optionally with a different set of weekdays/time
 * for the next cycle only), so it skips straight to payment, the
 * same way the ORIGINAL booking already skips repricing on every
 * Teacher revision.
 *
 * Mirrors `enrollment.service.ts`'s order/verify split exactly:
 * `createRenewalOrder` writes nothing, the chosen schedule and cycle
 * number travel in the Razorpay order's `notes`, and
 * `verifyRenewalPayment` re-derives pricing from those notes (never
 * the client's resent body) before writing anything. Idempotent on
 * `razorpayOrderId` via the Invoice's unique constraint, same
 * pattern as `verifyEnrollmentPayment`.
 *
 * What this deliberately does NOT do (flagged, not built): reconcile
 * from the Razorpay webhook the way `enrollment.service.ts`'s first
 * payment does — a renewal whose tab closes right after paying needs
 * the parent to come back to `/parent/enrollments` and retry, same
 * as it would if `/verify` failed outright. Worth adding before a
 * real launch, same open-decision shape as `06` #48-59.
 */

export class RenewalError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

interface RenewalInput {
  scheduleDays?: number[];
  scheduleTime?: string;
}

interface RenewalPlan {
  enrollmentId: string;
  nextCycleNumber: number;
  scheduleDays: number[];
  scheduleTime: string;
  cycleStartKey: string;
  sessionCount: number;
  ratePerSession: number;
  totalAmount: number;
  isInternationalPayment: boolean;
  internationalSurchargeAmount: number;
  amountPayable: number;
}

async function loadRenewableEnrollment(enrollmentId: string, parentId: string) {
  const enrollment = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, parentId },
    include: {
      cycles: { orderBy: { cycleNumber: "desc" }, take: 1 },
      parent: { select: { nriOrIndian: true, country: true } },
      course: { select: { subject: true } },
    },
  });

  if (!enrollment) {
    throw new RenewalError("Enrollment not found.", 404);
  }

  if (enrollment.isLegacy) {
    throw new RenewalError(
      "This enrollment doesn't use the cycle model, so there's no Renew action for it.",
      409,
    );
  }

  if (enrollment.status !== EnrollmentStatus.ACTIVE) {
    throw new RenewalError(
      enrollment.status === EnrollmentStatus.COMPLETED
        ? "This enrollment has already ended — enroll again to continue."
        : "This enrollment isn't active, so it can't be renewed.",
      409,
    );
  }

  const latestCycle = enrollment.cycles[0];

  if (!latestCycle) {
    throw new RenewalError("This enrollment doesn't have a cycle to renew yet.", 409);
  }

  return { enrollment, latestCycle };
}

/**
 * Opens `SESSION_POLICY.renewalWindowDays` before the current
 * cycle's `endDate` (inclusive) and stays open indefinitely after —
 * until either a next cycle exists (renewed) or the cycle closes
 * with none and `enrollmentCompletion.service.ts` ends the
 * Enrollment. No upper bound here on purpose: closing is what
 * actually cuts renewal off, not a date check.
 */
function renewalWindowOpensOn(cycleEndDate: Date): CalendarDate {
  return addDays(dateToCalendarDate(cycleEndDate), -(SESSION_POLICY.renewalWindowDays - 1));
}

function isRenewalWindowOpen(cycleEndDate: Date, today: CalendarDate): boolean {
  return compareDates(today, renewalWindowOpensOn(cycleEndDate)) >= 0;
}

async function buildRenewalPlan(
  enrollmentId: string,
  parentId: string,
  input: RenewalInput,
): Promise<RenewalPlan> {
  const { enrollment, latestCycle } = await loadRenewableEnrollment(enrollmentId, parentId);

  const today = todayInPlatformTz();

  if (!isRenewalWindowOpen(latestCycle.endDate, today)) {
    const opensOn = renewalWindowOpensOn(latestCycle.endDate);
    throw new RenewalError(
      `Renewal opens ${toDateKey(opensOn)} — ${SESSION_POLICY.renewalWindowDays} days before the current cycle ends.`,
      409,
    );
  }

  const nextCycleNumber = latestCycle.cycleNumber + 1;

  const alreadyRenewed = await prisma.enrollmentCycle.findUnique({
    where: { enrollmentId_cycleNumber: { enrollmentId, cycleNumber: nextCycleNumber } },
    select: { id: true },
  });

  if (alreadyRenewed) {
    throw new RenewalError("This enrollment has already been renewed for its next cycle.", 409);
  }

  const scheduleDays = Array.from(
    new Set(input.scheduleDays ?? enrollment.scheduleDays),
  ).sort((a, b) => a - b);

  if (
    scheduleDays.length === 0 ||
    scheduleDays.some((d) => !Number.isInteger(d) || d < 0 || d > 6)
  ) {
    throw new RenewalError("Pick at least one day of the week for classes.");
  }

  const scheduleTime = input.scheduleTime?.trim() || enrollment.scheduleTime;

  if (!isValidTimeOfDay(scheduleTime)) {
    throw new RenewalError("Pick a valid class time (HH:mm).");
  }

  // Fixed start — the day after the current cycle ends. Only the
  // schedule (which weekdays / what time) is the parent's to change;
  // "only one month can be bought at a time" means the start date
  // isn't.
  const plan = buildCyclePlan(
    toDateKey(addDays(dateToCalendarDate(latestCycle.endDate), 1)),
    scheduleDays,
  );

  if (!plan) {
    throw new RenewalError("Couldn't work out next month's dates — try again.");
  }

  const planProblem = getCyclePlanProblem(plan);

  if (planProblem) {
    throw new RenewalError(planProblem);
  }

  const ratePerSession = Number(enrollment.ratePerSession);
  const totalAmount = priceForSessions(ratePerSession, plan.sessionCount);

  const { isInternationalPayment, surchargeAmount, amountPayable } =
    priceWithInternationalSurcharge(
      totalAmount,
      enrollment.parent ? isInternationalParent(enrollment.parent) : false,
    );

  return {
    enrollmentId,
    nextCycleNumber,
    scheduleDays,
    scheduleTime,
    cycleStartKey: toDateKey(plan.startDate),
    sessionCount: plan.sessionCount,
    ratePerSession,
    totalAmount,
    isInternationalPayment,
    internationalSurchargeAmount: surchargeAmount,
    amountPayable,
  };
}

/** GET-route helper: eligibility + a preview using the enrollment's current schedule. */
export async function getRenewalStatus(enrollmentId: string, parentId: string) {
  const { enrollment, latestCycle } = await loadRenewableEnrollment(enrollmentId, parentId);
  const today = todayInPlatformTz();
  const opensOn = renewalWindowOpensOn(latestCycle.endDate);
  const eligible = isRenewalWindowOpen(latestCycle.endDate, today);

  const alreadyRenewed = await prisma.enrollmentCycle.findFirst({
    where: { enrollmentId, cycleNumber: latestCycle.cycleNumber + 1 },
    select: { id: true },
  });

  let preview: RenewalPlan | null = null;

  if (eligible && !alreadyRenewed) {
    try {
      preview = await buildRenewalPlan(enrollmentId, parentId, {});
    } catch {
      // Falls through with preview: null — the order call surfaces
      // the real error if the parent actually tries to renew.
    }
  }

  return {
    eligible: eligible && !alreadyRenewed,
    alreadyRenewed: Boolean(alreadyRenewed),
    opensOn: toDateKey(opensOn),
    currentCycleNumber: latestCycle.cycleNumber,
    currentCycleEndDate: toDateKey(dateToCalendarDate(latestCycle.endDate)),
    currentScheduleDays: enrollment.scheduleDays,
    currentScheduleTime: enrollment.scheduleTime,
    preview,
  };
}

export async function createRenewalOrder(
  enrollmentId: string,
  parentId: string,
  input: RenewalInput,
) {
  const plan = await buildRenewalPlan(enrollmentId, parentId, input);

  const razorpay = getRazorpayClient();

  const order = await razorpay.orders.create({
    amount: rupeesToPaise(plan.amountPayable),
    currency: "INR",
    receipt: `ren_${Date.now()}`,
    notes: {
      kind: "cycle_renewal",
      enrollmentId,
      parentId,
      cycleNumber: plan.nextCycleNumber,
      cycleStartDate: plan.cycleStartKey,
      sessionCount: plan.sessionCount,
      scheduleDays: JSON.stringify(plan.scheduleDays),
      scheduleTime: plan.scheduleTime,
    },
  });

  return {
    order: {
      id: order.id,
      amount: Number(order.amount),
      currency: order.currency,
    },
    keyId: getRazorpayKeyId(),
    pricing: plan,
  };
}

export interface VerifyRenewalPaymentInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

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
  const plan = buildCyclePlan(String(notes.cycleStartDate), scheduleDays);

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
