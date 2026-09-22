import { prisma } from "@/lib/prisma";
import { CycleStatus, EnrollmentStatus, type Enrollment } from "@prisma/client";

import {
  ClassSessionError,
  createCycleSessions,
  generateSessionsForEnrollment,
  regenerateFutureSessions,
} from "@/features/shared/server/classSession.service";
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
import {
  notifyEnrollmentTeacherApproved,
  notifyEnrollmentRevisionProposed,
  notifyEnrollmentRevisionConfirmed,
  notifyEnrollmentRevisionDeclined,
  notifyEnrollmentRejected,
  notifyEnrollmentActivated,
} from "@/features/shared/server/notificationTriggers.service";

/**
 * Sequential dual-approval workflow (resolves 06-OPEN-DECISIONS.md
 * #2, per direct clarification Sep 1, 2026):
 *
 *   PENDING_TEACHER_APPROVAL
 *     -> (Teacher approves as-is)        -> PENDING_ADMIN_APPROVAL
 *     -> (Teacher proposes a revision)   -> PENDING_PARENT_RECONFIRMATION
 *     -> (Teacher rejects)               -> REJECTED
 *
 *   PENDING_PARENT_RECONFIRMATION
 *     -> (Parent confirms the revision)  -> PENDING_ADMIN_APPROVAL
 *     -> (Parent declines)               -> CANCELLED
 *
 *   PENDING_ADMIN_APPROVAL
 *     -> (Admin approves)                -> ACTIVE
 *     -> (Admin rejects)                 -> REJECTED   (terminal — no bounce back to Teacher)
 *
 * The enrollment's ChatRoom is the sole Parent<->Teacher channel
 * throughout — any date/session discussion happens there, this
 * service only records the outcome (see `revisionNote`).
 *
 * CYCLE MODEL (Part 1A, Sep 2026): for non-legacy enrollments
 * (`isLegacy = false`) a revision means proposing a different
 * schedule and/or start date — the session count and price are
 * recalculated from that (`reviseCycleEnrollment`), the Teacher can
 * no longer type a session count, all sessions are created at Admin
 * approval, and the schedule can't be edited afterwards. A start
 * date that has already passed blocks both approvals until it is
 * revised. Legacy enrollments keep the original behavior below.
 */

/** True once the cycle's start date (a platform-timezone calendar date) is before today. */
function cycleStartHasPassed(enrollment: Pick<Enrollment, "cycleStartDate">) {
  return isStartDateInPast(
    dateToCalendarDate(enrollment.cycleStartDate),
    todayInPlatformTz(),
  );
}

const START_PASSED_MESSAGE =
  "This enrollment's start date has already passed. It has to be revised with a new start date before it can be approved.";

export class EnrollmentApprovalError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const enrollmentListInclude = {
  student: {
    select: { id: true, firstName: true, lastName: true, visibleName: true },
  },
  parent: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      visibleName: true,
      email: true,
      phone: true,
    },
  },
  teacher: {
    select: { id: true, firstName: true, lastName: true, visibleName: true },
  },
  course: { select: { id: true, courseTitle: true, subject: true } },
  chatRoom: { select: { id: true } },
} as const;

/**
 * Enrollments this Teacher needs to see: still in the approval
 * queue, already ACTIVE (added Sep 3, 2026 alongside cycle
 * progress — a Teacher needs to see ACTIVE enrollments to mark
 * sessions complete, not just pending ones), or COMPLETED (added
 * for the "My Classes"-style teacher page, so a finished cycle's
 * history/roster entry doesn't just disappear).
 */
export function getEnrollmentsForTeacher(teacherId: string) {
  return prisma.enrollment.findMany({
    where: {
      teacherId,
      status: {
        in: [
          EnrollmentStatus.PENDING_TEACHER_APPROVAL,
          EnrollmentStatus.PENDING_PARENT_RECONFIRMATION,
          EnrollmentStatus.PENDING_ADMIN_APPROVAL,
          EnrollmentStatus.ACTIVE,
          EnrollmentStatus.LAPSED,
          EnrollmentStatus.COMPLETED,
        ],
      },
    },
    include: enrollmentListInclude,
    orderBy: { createdAt: "desc" },
  });
}

/** Enrollments waiting on Admin's review — the Admin action queue. */
export function getEnrollmentsForAdmin() {
  return prisma.enrollment.findMany({
    where: { status: EnrollmentStatus.PENDING_ADMIN_APPROVAL },
    include: enrollmentListInclude,
    orderBy: { createdAt: "desc" },
  });
}

async function loadOwnedByTeacher(enrollmentId: string, teacherId: string) {
  const enrollment = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, teacherId },
  });

  if (!enrollment) {
    throw new EnrollmentApprovalError(
      "Enrollment not found, or doesn't belong to you.",
      404,
    );
  }

  return enrollment;
}

/** Teacher approves the enrollment exactly as the Parent paid for it. */
export async function teacherApproveEnrollment(
  enrollmentId: string,
  teacherId: string,
) {
  const enrollment = await loadOwnedByTeacher(enrollmentId, teacherId);

  if (enrollment.status !== EnrollmentStatus.PENDING_TEACHER_APPROVAL) {
    throw new EnrollmentApprovalError(
      "This enrollment isn't waiting on your review anymore.",
      409,
    );
  }

  if (!enrollment.isLegacy && cycleStartHasPassed(enrollment)) {
    throw new EnrollmentApprovalError(
      `${START_PASSED_MESSAGE} Use "Propose a change" to set a new start date.`,
      409,
    );
  }

  const updated = await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      teacherApprovedAt: new Date(),
      status: EnrollmentStatus.PENDING_ADMIN_APPROVAL,
    },
  });

  await notifyEnrollmentTeacherApproved(enrollmentId);

  return updated;
}

export interface TeacherReviseInput {
  cycleStartDate?: string;
  sessionsPerMonth?: number;
  /** Weekly recurring class days — 0=Sunday..6=Saturday. */
  scheduleDays?: number[];
  /** Weekly recurring class time, 24-hour "HH:mm". */
  scheduleTime?: string;
  note: string;
}

const SCHEDULE_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Teacher proposes a schedule/cycle change. `cycleStartDate` is
 * always safe to change (no cost impact — `dueDate` is simply
 * recalculated from it). `sessionsPerMonth` changes the price
 * (`monthlyRate`/`totalAmount`) — those are recalculated for the
 * record, but `amountPaid` (what Razorpay actually charged) is
 * NEVER touched here. If the new total no longer matches what was
 * paid, `pricingChangedAfterPayment` flips true so Admin sees a
 * clear flag instead of a silent mismatch — no automatic extra
 * charge or refund happens (that needs a manual/Razorpay-side
 * follow-up, out of scope here).
 */
export async function teacherReviseEnrollment(
  enrollmentId: string,
  teacherId: string,
  input: TeacherReviseInput,
) {
  const enrollment = await loadOwnedByTeacher(enrollmentId, teacherId);

  if (!enrollment.isLegacy) {
    return reviseCycleEnrollment(enrollment, input);
  }

  if (enrollment.status !== EnrollmentStatus.PENDING_TEACHER_APPROVAL) {
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

  const data: Record<string, unknown> = {
    revisedByTeacher: true,
    revisionNote: input.note.trim().slice(0, 1000),
    status: EnrollmentStatus.PENDING_PARENT_RECONFIRMATION,
  };

  let cycleStartDate = enrollment.cycleStartDate;

  if (input.cycleStartDate) {
    const parsed = new Date(input.cycleStartDate);

    if (Number.isNaN(parsed.getTime())) {
      throw new EnrollmentApprovalError("That doesn't look like a valid date.");
    }

    cycleStartDate = parsed;
    const dueDate = new Date(parsed);
    dueDate.setMonth(dueDate.getMonth() + 1);

    data.cycleStartDate = cycleStartDate;
    data.dueDate = dueDate;
  }

  if (input.sessionsPerMonth) {
    if (
      !Number.isInteger(input.sessionsPerMonth) ||
      input.sessionsPerMonth < 4 ||
      input.sessionsPerMonth > 31
    ) {
      throw new EnrollmentApprovalError(
        "sessionsPerMonth must be a whole number between 4 and 31.",
      );
    }

    const monthlyRate = Number(enrollment.ratePerSession) * input.sessionsPerMonth;
    const totalAmount = monthlyRate * enrollment.noOfMonths;

    data.sessionsPerMonth = input.sessionsPerMonth;
    data.monthlyRate = monthlyRate;
    data.totalAmount = totalAmount;
    data.pricingChangedAfterPayment = totalAmount !== Number(enrollment.amountPaid);
  }

  if (input.scheduleDays) {
    const scheduleDays = Array.from(new Set(input.scheduleDays)).sort(
      (a, b) => a - b,
    );

    if (
      scheduleDays.length === 0 ||
      scheduleDays.some((d) => !Number.isInteger(d) || d < 0 || d > 6)
    ) {
      throw new EnrollmentApprovalError(
        "Pick at least one valid day of the week.",
      );
    }

    data.scheduleDays = scheduleDays;
  }

  if (input.scheduleTime) {
    if (!SCHEDULE_TIME_PATTERN.test(input.scheduleTime)) {
      throw new EnrollmentApprovalError("That doesn't look like a valid time (HH:mm).");
    }

    data.scheduleTime = input.scheduleTime;
  }

  const updated = await prisma.enrollment.update({
    where: { id: enrollmentId },
    data,
  });

  await notifyEnrollmentRevisionProposed(enrollmentId, input.note.trim());

  return updated;
}

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
async function reviseCycleEnrollment(
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

  const plan = buildCyclePlan(startKey, scheduleDays);

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

export async function teacherRejectEnrollment(
  enrollmentId: string,
  teacherId: string,
  reason: string,
) {
  const enrollment = await loadOwnedByTeacher(enrollmentId, teacherId);

  if (
    enrollment.status !== EnrollmentStatus.PENDING_TEACHER_APPROVAL &&
    enrollment.status !== EnrollmentStatus.PENDING_PARENT_RECONFIRMATION
  ) {
    throw new EnrollmentApprovalError(
      "This enrollment isn't waiting on you anymore.",
      409,
    );
  }

  const updated = await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      status: EnrollmentStatus.REJECTED,
      rejectedBy: "TEACHER",
      rejectionReason: reason?.trim().slice(0, 1000) || null,
    },
  });

  await notifyEnrollmentRejected(enrollmentId, "TEACHER");

  return updated;
}

async function loadOwnedByParent(enrollmentId: string, parentId: string) {
  const enrollment = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, parentId },
  });

  if (!enrollment) {
    throw new EnrollmentApprovalError(
      "Enrollment not found, or doesn't belong to your account.",
      404,
    );
  }

  return enrollment;
}

/** Parent accepts the Teacher's proposed revision — moves on to Admin. */
export async function parentConfirmRevision(
  enrollmentId: string,
  parentId: string,
) {
  const enrollment = await loadOwnedByParent(enrollmentId, parentId);

  if (enrollment.status !== EnrollmentStatus.PENDING_PARENT_RECONFIRMATION) {
    throw new EnrollmentApprovalError(
      "There's no pending revision to confirm on this enrollment.",
      409,
    );
  }

  const updated = await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      teacherApprovedAt: new Date(),
      status: EnrollmentStatus.PENDING_ADMIN_APPROVAL,
    },
  });

  await notifyEnrollmentRevisionConfirmed(enrollmentId);

  return updated;
}

/** Parent declines the Teacher's proposed revision — enrollment is cancelled. */
export async function parentDeclineRevision(
  enrollmentId: string,
  parentId: string,
) {
  const enrollment = await loadOwnedByParent(enrollmentId, parentId);

  if (enrollment.status !== EnrollmentStatus.PENDING_PARENT_RECONFIRMATION) {
    throw new EnrollmentApprovalError(
      "There's no pending revision to decline on this enrollment.",
      409,
    );
  }

  const updated = await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: { status: EnrollmentStatus.CANCELLED },
  });

  await notifyEnrollmentRevisionDeclined(enrollmentId);

  return updated;
}

async function loadPendingAdminReview(enrollmentId: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
  });

  if (!enrollment) {
    throw new EnrollmentApprovalError("Enrollment not found.", 404);
  }

  return enrollment;
}

/** Admin approves — final step, enrollment goes ACTIVE and lectures can be scheduled. */
export async function adminApproveEnrollment(enrollmentId: string) {
  const enrollment = await loadPendingAdminReview(enrollmentId);

  if (enrollment.status !== EnrollmentStatus.PENDING_ADMIN_APPROVAL) {
    throw new EnrollmentApprovalError(
      "This enrollment isn't waiting on admin approval.",
      409,
    );
  }

  if (!enrollment.isLegacy) {
    if (cycleStartHasPassed(enrollment)) {
      throw new EnrollmentApprovalError(
        `${START_PASSED_MESSAGE} Ask the teacher to propose a new start date.`,
        409,
      );
    }

    // Cycle model: the enrollment only becomes ACTIVE if all of its
    // cycle-1 sessions were created too — one transaction, so a
    // failure leaves it pending instead of active-with-no-classes.
    let activated;

    try {
      activated = await prisma.$transaction(async (tx) => {
        const row = await tx.enrollment.update({
          where: { id: enrollmentId },
          data: {
            adminApprovedAt: new Date(),
            status: EnrollmentStatus.ACTIVE,
          },
        });

        await createCycleSessions(tx, enrollmentId, 1);

        return row;
      });
    } catch (err) {
      if (err instanceof ClassSessionError) {
        throw new EnrollmentApprovalError(err.message, err.status);
      }

      throw err;
    }

    await notifyEnrollmentActivated(enrollmentId);

    return activated;
  }

  const updated = await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      adminApprovedAt: new Date(),
      status: EnrollmentStatus.ACTIVE,
    },
  });

  // Schedule is set by the Parent at Enrollment creation
  // (parent/server/enrollment.service.ts), so it's already known
  // here — generate the first batch of real, dated ClassSession
  // rows now that lectures can actually be scheduled. No-ops if
  // scheduleDays somehow ended up empty. See classSession.service.ts.
  await generateSessionsForEnrollment(updated);
  await notifyEnrollmentActivated(enrollmentId);

  return updated;
}

const SET_SCHEDULE_STATUSES: EnrollmentStatus[] = [
  EnrollmentStatus.ACTIVE,
  EnrollmentStatus.LAPSED,
];

/**
 * Lets a Teacher set/correct the weekly recurring schedule on an
 * enrollment that's already ACTIVE (or LAPSED) — i.e. fully
 * approved, with no cost/approval impact, so it doesn't need to go
 * through `teacherReviseEnrollment`'s Parent-reconfirmation flow.
 *
 * Exists for two cases: (1) enrollments created before
 * `scheduleDays`/`scheduleTime` existed on the schema default to an
 * empty schedule and otherwise have no way to ever get one, and (2)
 * simple corrections (wrong day/time typed at enrollment) that
 * don't warrant a full revision-and-reconfirm round trip. The
 * calendar (`scheduleOccurrences.service.ts`) reads straight off
 * these two fields, so this is what unblocks a "why isn't my
 * enrolled student showing on the calendar" case for old rows.
 */
export async function setEnrollmentSchedule(
  enrollmentId: string,
  teacherId: string,
  input: { scheduleDays: number[]; scheduleTime: string },
) {
  const enrollment = await loadOwnedByTeacher(enrollmentId, teacherId);

  if (!enrollment.isLegacy) {
    throw new EnrollmentApprovalError(
      "The schedule can't be edited mid-cycle. Use a reschedule request to move an individual class.",
      409,
    );
  }

  if (!SET_SCHEDULE_STATUSES.includes(enrollment.status)) {
    throw new EnrollmentApprovalError(
      "Schedule can only be set on an active enrollment.",
      409,
    );
  }

  const scheduleDays = Array.from(new Set(input.scheduleDays ?? [])).sort(
    (a, b) => a - b,
  );

  if (
    scheduleDays.length === 0 ||
    scheduleDays.some((d) => !Number.isInteger(d) || d < 0 || d > 6)
  ) {
    throw new EnrollmentApprovalError(
      "Pick at least one valid day of the week.",
    );
  }

  if (!input.scheduleTime || !SCHEDULE_TIME_PATTERN.test(input.scheduleTime)) {
    throw new EnrollmentApprovalError("That doesn't look like a valid time (HH:mm).");
  }

  const updated = await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: { scheduleDays, scheduleTime: input.scheduleTime },
  });

  // Future SCHEDULED sessions were generated off the old
  // schedule (or none existed yet) — drop and regenerate them from
  // the corrected one. Never touches COMPLETED/CANCELLED history.
  await regenerateFutureSessions(enrollmentId);

  return updated;
}

/**
 * Admin rejects — terminal, per direct instruction. Does not bounce
 * back to the Teacher even though the Teacher already approved it.
 */
export async function adminRejectEnrollment(
  enrollmentId: string,
  reason: string,
) {
  const enrollment = await loadPendingAdminReview(enrollmentId);

  if (enrollment.status !== EnrollmentStatus.PENDING_ADMIN_APPROVAL) {
    throw new EnrollmentApprovalError(
      "This enrollment isn't waiting on admin approval.",
      409,
    );
  }

  const updated = await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      status: EnrollmentStatus.REJECTED,
      rejectedBy: "ADMIN",
      rejectionReason: reason?.trim().slice(0, 1000) || null,
    },
  });

  await notifyEnrollmentRejected(enrollmentId, "ADMIN");

  return updated;
}
