import {
    notifyEnrollmentRevisionProposed
} from "@/features/shared/server/notificationTriggers.service";
import {
    buildCyclePlan,
    getCyclePlanProblem,
    isStartDateInPast,
    priceForSessions,
} from "@/features/shared/utils/cyclePlan";
import {
    calendarDateToDate,
    dateToCalendarDate,
    isValidTimeOfDay,
    parseDateKey,
    toDateKey,
    todayInPlatformTz,
} from "@/lib/platformTime";
import { prisma } from "@/lib/prisma";
import { CycleStatus, EnrollmentStatus, type Enrollment } from "@prisma/client";
import { EnrollmentApprovalError, cycleStartHasPassed } from './base';
import { TeacherReviseInput } from './teacher';

/**
 * Cycle-model revision: the Teacher proposes a different weekly
 * schedule and/or start date. Session count and price are
 * recalculated from the new plan (session rate x count, min 4), the
 * open cycle record is updated to match, and `amountPaid` is never
 * touched — if the recalculated total no longer equals the base
 * amount that was actually paid, `pricingChangedAfterPayment` flips
 * true exactly as it always has.
 *
 * Allowed while PENDING_TEACHER_APPROVAL, and also while
 * PENDING_ADMIN_APPROVAL but only when the start date has passed
 * (otherwise a stale start date would have no way to get revised —
 * Admin can only approve or reject).
 */
export async function reviseCycleEnrollment(
  enrollment: Enrollment,
  input: TeacherReviseInput,
) {
  const startPassed = cycleStartHasPassed(enrollment);
  const canRevise =
    enrollment.status === EnrollmentStatus.PENDING_TEACHER_APPROVAL ||
    (enrollment.status === EnrollmentStatus.PENDING_ADMIN_APPROVAL &&
      startPassed);

  if (!canRevise) {
    throw new EnrollmentApprovalError(
      "This enrollment isn't waiting on your review anymore.",
      409,
    );
  }

  if (!input.note?.trim()) {
    throw new EnrollmentApprovalError(
      "Add a short note explaining the change — the parent will see this.",
    );
  }

  if (input.sessionsPerMonth != null) {
    throw new EnrollmentApprovalError(
      "The number of sessions now follows from the schedule and start date — change those instead.",
    );
  }

  let startKey = toDateKey(dateToCalendarDate(enrollment.cycleStartDate));

  if (input.cycleStartDate) {
    const parsed = parseDateKey(input.cycleStartDate);

    if (!parsed) {
      throw new EnrollmentApprovalError("That doesn't look like a valid date.");
    }

    startKey = toDateKey(parsed);
  }

  const scheduleDays = input.scheduleDays
    ? Array.from(new Set(input.scheduleDays)).sort((a, b) => a - b)
    : enrollment.scheduleDays;

  if (
    scheduleDays.length === 0 ||
    scheduleDays.some((d) => !Number.isInteger(d) || d < 0 || d > 6)
  ) {
    throw new EnrollmentApprovalError(
      "Pick at least one valid day of the week.",
    );
  }

  const scheduleTime = input.scheduleTime ?? enrollment.scheduleTime;

  if (!isValidTimeOfDay(scheduleTime)) {
    throw new EnrollmentApprovalError(
      "That doesn't look like a valid time (HH:mm).",
    );
  }

  const plan = buildCyclePlan(startKey, scheduleDays, enrollment.planType);

  if (!plan) {
    throw new EnrollmentApprovalError("That doesn't look like a valid date.");
  }

  if (isStartDateInPast(plan.startDate, todayInPlatformTz())) {
    throw new EnrollmentApprovalError(
      "The start date can't be in the past — pick a new one.",
    );
  }

  const planProblem = getCyclePlanProblem(plan);

  if (planProblem) {
    throw new EnrollmentApprovalError(planProblem);
  }

  const totalAmount = priceForSessions(
    Number(enrollment.ratePerSession),
    plan.sessionCount,
  );
  const basePaid =
    Math.round(
      (Number(enrollment.amountPaid) -
        Number(enrollment.internationalSurchargeAmount)) *
        100,
    ) / 100;

  const [updated] = await prisma.$transaction([
    prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        revisedByTeacher: true,
        revisionNote: input.note.trim().slice(0, 1000),
        status: EnrollmentStatus.PENDING_PARENT_RECONFIRMATION,
        cycleStartDate: calendarDateToDate(plan.startDate),
        dueDate: calendarDateToDate(plan.nextCycleStart),
        scheduleDays,
        scheduleTime,
        // Kept in step with the cycle so every screen, the ledger and
        // the rate calculator (which read these two) stay correct.
        sessionsPerMonth: plan.sessionCount,
        noOfMonths: 1,
        monthlyRate: totalAmount,
        totalAmount,
        pricingChangedAfterPayment: totalAmount !== basePaid,
      },
    }),
    prisma.enrollmentCycle.updateMany({
      where: {
        enrollmentId: enrollment.id,
        cycleNumber: 1,
        status: CycleStatus.OPEN,
      },
      data: {
        startDate: calendarDateToDate(plan.startDate),
        endDate: calendarDateToDate(plan.endDate),
        sessionCount: plan.sessionCount,
        price: totalAmount,
      },
    }),
  ]);

  await notifyEnrollmentRevisionProposed(enrollment.id, input.note.trim());

  return updated;
}
