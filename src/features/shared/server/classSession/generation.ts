import { buildCyclePlan } from "@/features/shared/utils/cyclePlan";
import { DEFAULT_SESSION_LENGTH_MINUTES } from "@/lib/platformConfig";
import {
    calendarDateToDate,
    dateToCalendarDate,
    isValidTimeOfDay,
    platformWallClockToUtc,
    toDateKey,
} from "@/lib/platformTime";
import { prisma } from "@/lib/prisma";
import {
    ClassSessionStatus,
    type Prisma
} from "@prisma/client";
import "server-only";
import { ClassSessionError, EnrollmentForGeneration, GENERATION_HORIZON_DAYS, GENERATION_STATUSES, addDays, cycleWindow, startOfDay } from './core';

/**
 * Generates any missing `ClassSession` rows for this enrollment,
 * from today (or the cycle start, if it's still in the future) up to
 * `GENERATION_HORIZON_DAYS` ahead, or the enrollment's own contract
 * end — whichever is sooner. Idempotent — relies on
 * `@@unique([enrollmentId, scheduledDate])` + `skipDuplicates`, so
 * calling this repeatedly is always safe and cheap once a range is
 * already generated. No-ops if no schedule has been agreed yet.
 */
export async function generateSessionsForEnrollment(
  enrollment: EnrollmentForGeneration,
) {
  // Cycle-model enrollments get all their sessions once, at
  // activation (`createCycleSessions`) — never lazily.
  if (!enrollment.isLegacy) {
    return;
  }

  if (!enrollment.scheduleDays?.length) {
    return;
  }

  const { start, end } = cycleWindow(enrollment);
  const today = startOfDay(new Date());
  const horizon = addDays(today, GENERATION_HORIZON_DAYS);

  const rangeStart = start > today ? start : today;
  const rangeEnd = end < horizon ? end : horizon;

  if (rangeStart >= rangeEnd) {
    return;
  }

  const daySet = new Set(enrollment.scheduleDays);
  const rows: {
    enrollmentId: string;
    teacherId: string;
    studentId: string;
    parentId: string;
    scheduledDate: Date;
    scheduledTime: string | null;
  }[] = [];

  const cursor = new Date(rangeStart);
  while (cursor < rangeEnd) {
    if (daySet.has(cursor.getDay())) {
      rows.push({
        enrollmentId: enrollment.id,
        teacherId: enrollment.teacherId,
        studentId: enrollment.studentId,
        parentId: enrollment.parentId,
        scheduledDate: new Date(cursor),
        scheduledTime: enrollment.scheduleTime,
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  if (rows.length === 0) {
    return;
  }

  await prisma.classSession.createMany({
    data: rows,
    skipDuplicates: true,
  });
}
/**
 * Loads the enrollment and (if it's ACTIVE/LAPSED with a schedule)
 * generates any missing upcoming sessions. Safe/cheap to call from
 * any read path — see file header. Returns the enrollment row (or
 * null if it doesn't exist) either way.
 */
export async function ensureSessionsGenerated(enrollmentId: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
  });

  if (!enrollment || !GENERATION_STATUSES.includes(enrollment.status)) {
    return enrollment;
  }

  await generateSessionsForEnrollment(enrollment);
  return enrollment;
}
/**
 * Called after a Teacher sets/corrects `scheduleDays`/`scheduleTime`
 * (`enrollmentApproval.service.ts`'s `setEnrollmentSchedule`).
 * Deletes future, still-SCHEDULED rows (never touches
 * COMPLETED/CANCELLED history) and regenerates from the new
 * schedule.
 */
export async function regenerateFutureSessions(enrollmentId: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
  });

  // Must stay ahead of the deleteMany below: a cycle-model
  // enrollment's sessions are fixed once created, never regenerated.
  if (!enrollment || !enrollment.isLegacy) {
    return;
  }

  const today = startOfDay(new Date());

  await prisma.classSession.deleteMany({
    where: {
      enrollmentId,
      status: ClassSessionStatus.SCHEDULED,
      scheduledDate: { gte: today },
    },
  });

  await generateSessionsForEnrollment(enrollment);
}
/**
 * Cycle model: creates every session of one cycle at once, numbered
 * 1..N, each with a real start and end instant. Called from inside
 * the activation transaction (`adminApproveEnrollment`) so the
 * enrollment only becomes ACTIVE if its sessions were created too.
 *
 * Idempotent — if the cycle already has sessions it does nothing, so
 * a retry can never add extras. Throws (rolling the caller's
 * transaction back) if the schedule no longer produces exactly the
 * number of sessions the cycle was priced and paid for.
 */
export async function createCycleSessions(
  tx: Prisma.TransactionClient,
  enrollmentId: string,
  cycleNumber = 1,
) {
  const cycle = await tx.enrollmentCycle.findUnique({
    where: { enrollmentId_cycleNumber: { enrollmentId, cycleNumber } },
    include: { enrollment: true },
  });

  if (!cycle) {
    throw new ClassSessionError(
      `Cycle ${cycleNumber} not found for this enrollment.`,
      404,
    );
  }

  const { enrollment } = cycle;

  const existing = await tx.classSession.count({
    where: { cycleId: cycle.id },
  });

  if (existing > 0) {
    return existing;
  }

  if (!isValidTimeOfDay(enrollment.scheduleTime)) {
    throw new ClassSessionError(
      "This enrollment has no valid class time, so its sessions can't be created.",
      409,
    );
  }

  const plan = buildCyclePlan(
    toDateKey(dateToCalendarDate(cycle.startDate)),
    enrollment.scheduleDays,
    enrollment.planType,
  );

  if (
    !plan ||
    plan.sessionCount !== cycle.sessionCount ||
    toDateKey(plan.endDate) !== toDateKey(dateToCalendarDate(cycle.endDate))
  ) {
    throw new ClassSessionError(
      "This enrollment's schedule no longer matches what was paid for — send it back for a revision instead of approving it.",
      409,
    );
  }

  const lengthMinutes =
    enrollment.sessionLengthMinutes ?? DEFAULT_SESSION_LENGTH_MINUTES;

  const rows = plan.sessionDates.map((date, index) => {
    const startsAt = platformWallClockToUtc(date, enrollment.scheduleTime!);

    return {
      enrollmentId: enrollment.id,
      cycleId: cycle.id,
      sessionNumber: index + 1,
      teacherId: enrollment.teacherId,
      studentId: enrollment.studentId,
      parentId: enrollment.parentId,
      // Same calendar-date/"HH:mm" fields every existing reader
      // (calendar, reminders, reschedule) already understands.
      scheduledDate: calendarDateToDate(date),
      scheduledTime: enrollment.scheduleTime,
      startsAt,
      endsAt: new Date(startsAt.getTime() + lengthMinutes * 60_000),
      lengthMinutes,
    };
  });

  const result = await tx.classSession.createMany({
    data: rows,
    skipDuplicates: true,
  });

  return result.count;
}
/** Every session for one enrollment, earliest first — the Teacher's per-enrollment sessions list. */
export async function listSessionsForEnrollment(
  enrollmentId: string,
  teacherId: string,
) {
  const enrollment = await ensureSessionsGenerated(enrollmentId);

  if (!enrollment || enrollment.teacherId !== teacherId) {
    throw new ClassSessionError(
      "Enrollment not found, or doesn't belong to you.",
      404,
    );
  }

  return prisma.classSession.findMany({
    where: { enrollmentId },
    orderBy: { scheduledDate: "asc" },
    // This list goes to the Teacher. A parent's "Report a problem"
    // note (Part 2A) is for the parent and Admin only.
    omit: { reportNote: true },
  });
}
