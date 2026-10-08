import { buildCyclePlan, getCyclePlanProblem, priceForSessions } from "@/features/shared/utils/cyclePlan";
import {
    isInternationalParent,
    priceWithInternationalSurcharge,
} from "@/lib/internationalPayments";
import { SESSION_POLICY } from "@/lib/platformConfig";
import {
    addDays,
    compareDates,
    dateToCalendarDate,
    isValidTimeOfDay,
    toDateKey,
    todayInPlatformTz,
    type CalendarDate
} from "@/lib/platformTime";
import { prisma } from "@/lib/prisma";
import {
    EnrollmentStatus
} from "@prisma/client";
import "server-only";

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
export interface RenewalInput {
  scheduleDays?: number[];
  scheduleTime?: string;
}
export interface RenewalPlan {
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
export async function loadRenewableEnrollment(enrollmentId: string, parentId: string) {
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
export function renewalWindowOpensOn(cycleEndDate: Date): CalendarDate {
  return addDays(dateToCalendarDate(cycleEndDate), -(SESSION_POLICY.renewalWindowDays - 1));
}
export function isRenewalWindowOpen(cycleEndDate: Date, today: CalendarDate): boolean {
  return compareDates(today, renewalWindowOpensOn(cycleEndDate)) >= 0;
}
export async function buildRenewalPlan(
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
    enrollment.planType,
  );

  if (!plan) {
    throw new RenewalError("Couldn't work out the next cycle's dates — try again.");
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
