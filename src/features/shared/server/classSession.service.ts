import "server-only";

import { prisma } from "@/lib/prisma";
import {
  ClassSessionStatus,
  CyclePayoutStatus,
  Enrollment,
  EnrollmentStatus,
  type Prisma,
} from "@prisma/client";

import { DEFAULT_SESSION_LENGTH_MINUTES } from "@/lib/platformConfig";
import {
  calendarDateToDate,
  dateToCalendarDate,
  isValidTimeOfDay,
  platformWallClockToUtc,
  toDateKey,
} from "@/lib/platformTime";
import { buildCyclePlan } from "@/features/shared/utils/cyclePlan";
import { createLedgerEntryForCompletedCycle } from "@/features/shared/server/tuitionLedger.service";
import {
  notifyClassSessionCompleted,
  notifyCyclePayoutReady,
} from "@/features/shared/server/notificationTriggers.service";

/**
 * ClassSession — the actual record of a class happening (or being
 * scheduled to happen), tied to a real date/time. Resolves the
 * single biggest MVP gap flagged in 07-LESSONS-LEARNED.md /
 * 03-DATA-MODEL.md: before this, "sessions completed" was a blind
 * Teacher-only counter click (the old `cycleProgress.service.ts`,
 * now a thin compatibility wrapper around this file) with no record
 * of which date it corresponded to, and the Tuition Ledger's
 * CCC/MCC/TCC columns were hardcoded to 0
 * (`features/accounts/server/export.service.ts`) because there was
 * nothing to count.
 *
 * Rows are generated from an Enrollment's recurring
 * `scheduleDays`/`scheduleTime` (same convention the old
 * `scheduleOccurrences.service.ts` used to compute on the fly — that
 * file now reads from this table instead), so a session's
 * date/time/status is a real, stored fact that survives a later
 * schedule change: editing `scheduleDays`/`scheduleTime` only
 * regenerates *future*, still-SCHEDULED rows
 * (`regenerateFutureSessions`), never rewrites COMPLETED/CANCELLED
 * history.
 *
 * Generation is lazy/idempotent (`ensureSessionsGenerated`) rather
 * than cron-driven — there's no job runner in this project yet
 * (06-OPEN-DECISIONS.md has no ReminderJob/cron entity either), so
 * it's called opportunistically from the calendar routes, the
 * per-enrollment sessions list, and the mark-complete flow. The
 * `[enrollmentId, scheduledDate]` unique constraint makes repeated
 * generation calls safe (`skipDuplicates`).
 *
 * CYCLE MODEL (Part 1A, Sep 2026): everything above describes the
 * LEGACY path (`Enrollment.isLegacy = true`). Non-legacy enrollments
 * never use lazy generation — `createCycleSessions()` creates every
 * session of a cycle, exactly once, inside the transaction that
 * activates the enrollment, and `generateSessionsForEnrollment` /
 * `regenerateFutureSessions` are no-ops for them so nothing extra can
 * ever appear later.
 */

export class ClassSessionError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * How far ahead (from today) to keep sessions generated. Bounds the
 * work `ensureSessionsGenerated` does on each call, since it's
 * re-run opportunistically rather than on a fixed schedule.
 */
const GENERATION_HORIZON_DAYS = 45;

const GENERATION_STATUSES: EnrollmentStatus[] = [
  EnrollmentStatus.ACTIVE,
  EnrollmentStatus.LAPSED,
];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** [cycleStartDate, cycleStartDate + noOfMonths) — the full contract window. */
function cycleWindow(enrollment: { cycleStartDate: Date; noOfMonths: number }) {
  const start = startOfDay(new Date(enrollment.cycleStartDate));
  const end = new Date(start);
  end.setMonth(end.getMonth() + enrollment.noOfMonths);
  return { start, end };
}

type EnrollmentForGeneration = Pick<
  Enrollment,
  | "id"
  | "teacherId"
  | "studentId"
  | "parentId"
  | "cycleStartDate"
  | "noOfMonths"
  | "scheduleDays"
  | "scheduleTime"
  | "isLegacy"
>;

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
  });
}

const enrollmentWithRelationsInclude = {
  student: { select: { id: true, firstName: true, visibleName: true } },
  course: { select: { id: true, courseTitle: true } },
} as const;

/**
 * Recomputes `Enrollment.sessionsCompletedInCycle` /
 * `cyclesCompleted` / `cyclePayoutStatus` from the enrollment's
 * actual completed `ClassSession` count. Keeps the same "reset at
 * sessionsPerMonth" shape the project already had
 * (`cycleProgress.service.ts`'s original doc-comment) — this only
 * changes *what* drives the counter (a real completed
 * `ClassSession`, not a blind click), per the direct instruction
 * that logged that placeholder ("later we will set increment and
 * logic after connection with zoho api").
 *
 * Deriving from the all-time completed count (rather than trying to
 * track state incrementally) means this stays correct even if a
 * session gets marked complete out of date order — e.g. a Teacher
 * catching up on a missed click for an earlier date.
 *
 * Cycle completion also writes a real `TuitionLedgerEntry`
 * (tuitionLedger.service.ts), same as the counter-based
 * `cycleProgress.service.ts` did before this file replaced it —
 * this must stay wired or Accounts' payout-verification queue goes
 * silently dark. Both writes happen in one transaction so the
 * cycle-progress update and the ledger entry can't drift apart.
 * `cyclesCompleted` increasing versus the pre-update row is what
 * "a cycle just completed" means here (rather than re-checking
 * `sessionsCompletedInCycle === 0`), since deriving from the
 * all-time count can jump straight past a cycle boundary if a
 * Teacher marks several overdue sessions complete at once —
 * `createLedgerEntryForCompletedCycle` is still safe to call once
 * per resulting cycle number even so, via its own
 * unique-constraint/P2002 idempotency guard.
 */
async function recomputeEnrollmentCounters(enrollmentId: string) {
  const before = await prisma.enrollment.findUniqueOrThrow({
    where: { id: enrollmentId },
  });

  const totalCompleted = await prisma.classSession.count({
    where: { enrollmentId, status: ClassSessionStatus.COMPLETED },
  });

  const perCycle = Math.max(1, before.sessionsPerMonth);
  const cyclesCompleted = Math.floor(totalCompleted / perCycle);
  const sessionsCompletedInCycle = totalCompleted % perCycle;
  const cyclePayoutStatus =
    sessionsCompletedInCycle === 0 && totalCompleted > 0
      ? CyclePayoutStatus.READY_FOR_PAYOUT
      : CyclePayoutStatus.IN_PROGRESS;

  const lastCompleted = await prisma.classSession.findFirst({
    where: { enrollmentId, status: ClassSessionStatus.COMPLETED },
    orderBy: { completedAt: "desc" },
    select: { completedAt: true },
  });

  const cycleJustCompleted = cyclesCompleted > before.cyclesCompleted;

  const updateData = {
    sessionsCompletedInCycle,
    cyclesCompleted,
    cyclePayoutStatus,
    lastSessionMarkedAt: lastCompleted?.completedAt ?? before.lastSessionMarkedAt,
    lastClassAt: lastCompleted?.completedAt ?? before.lastClassAt,
  };

  if (!cycleJustCompleted) {
    return prisma.enrollment.update({
      where: { id: enrollmentId },
      data: updateData,
      include: enrollmentWithRelationsInclude,
    });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updated = await tx.enrollment.update({
      where: { id: enrollmentId },
      data: updateData,
      include: enrollmentWithRelationsInclude,
    });

    await createLedgerEntryForCompletedCycle(tx, updated);

    return updated;
  });

  await notifyCyclePayoutReady(enrollmentId);

  return updated;
}

/**
 * Marks a specific session complete — Teacher-only, must own it and
 * it must still be SCHEDULED. Recomputes the Enrollment's cycle
 * counters from the resulting set of completed sessions.
 */
export async function markClassSessionComplete(
  sessionId: string,
  teacherId: string,
) {
  const session = await prisma.classSession.findFirst({
    where: { id: sessionId, teacherId },
  });

  if (!session) {
    throw new ClassSessionError(
      "Session not found, or doesn't belong to you.",
      404,
    );
  }

  if (session.status !== ClassSessionStatus.SCHEDULED) {
    throw new ClassSessionError(
      `This session is already marked ${session.status.toLowerCase()}.`,
      409,
    );
  }

  await prisma.classSession.update({
    where: { id: sessionId },
    data: {
      status: ClassSessionStatus.COMPLETED,
      completedAt: new Date(),
      completedByRole: "TEACHER",
    },
  });

  const result = await recomputeEnrollmentCounters(session.enrollmentId);
  await notifyClassSessionCompleted(sessionId);

  return result;
}

/**
 * Backward-compatible one-click path — the original "Mark session
 * complete" button. Finds the earliest still-SCHEDULED session that
 * is already due (`scheduledDate` <= today) and marks *that one*
 * complete, instead of blindly incrementing a counter with no date
 * behind it. Used by `PATCH
 * /api/teacher/enrollments/[id]/mark-session` so the existing
 * one-click UI keeps working unchanged; `PATCH
 * /api/teacher/class-sessions/[id]/complete` is the explicit,
 * pick-a-specific-date path the new sessions list uses.
 */
export async function markNextDueSessionComplete(
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

  if (enrollment.status !== EnrollmentStatus.ACTIVE) {
    throw new ClassSessionError(
      "Sessions can only be marked complete for an active enrollment.",
    );
  }

  const endOfToday = startOfDay(new Date());
  endOfToday.setDate(endOfToday.getDate() + 1);

  const next = await prisma.classSession.findFirst({
    where: {
      enrollmentId,
      teacherId,
      status: ClassSessionStatus.SCHEDULED,
      scheduledDate: { lt: endOfToday },
    },
    orderBy: { scheduledDate: "asc" },
  });

  if (!next) {
    throw new ClassSessionError(
      "No scheduled class is due to be marked complete yet — check the schedule, or mark a specific date from the sessions list.",
      409,
    );
  }

  return markClassSessionComplete(next.id, teacherId);
}

export interface EnrollmentSessionCounts {
  ccc: number;
  mcc: number;
  tcc: number;
}

/**
 * Batched CCC/MCC/TCC for a set of enrollments at once — used by the
 * Tuition Ledger export, which previously hardcoded all three to 0
 * (see `features/accounts/server/export.service.ts`'s old
 * doc-comment: "no ClassSession model yet"). Definitions (documented
 * here since nothing else in the project spec fixes them — flagged
 * as a judgment call, same footing as the pricing formula in
 * 03-DATA-MODEL.md):
 *
 *   CCC (Current Class Completed) — `Enrollment.sessionsCompletedInCycle`,
 *     i.e. progress in the *cycle* currently running.
 *   MCC (Monthly Class Completed) — sessions completed within the
 *     current *calendar* month for that enrollment. Deliberately
 *     distinct from CCC — a cycle and a calendar month only line up
 *     if the cycle happens to start on the 1st.
 *   TCC (Total Class Completed) — all-time completed sessions for
 *     that enrollment.
 *
 * Confirm this split with Aman before treating it as settled, same
 * as the other flagged assumptions in 06-OPEN-DECISIONS.md.
 */
export async function getSessionCountsForEnrollments(
  enrollmentIds: string[],
): Promise<Map<string, EnrollmentSessionCounts>> {
  const counts = new Map<string, EnrollmentSessionCounts>();

  if (enrollmentIds.length === 0) {
    return counts;
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [cccRows, mccRows, tccRows] = await Promise.all([
    prisma.enrollment.findMany({
      where: { id: { in: enrollmentIds } },
      select: { id: true, sessionsCompletedInCycle: true },
    }),
    prisma.classSession.groupBy({
      by: ["enrollmentId"],
      where: {
        enrollmentId: { in: enrollmentIds },
        status: ClassSessionStatus.COMPLETED,
        scheduledDate: { gte: monthStart, lt: monthEnd },
      },
      _count: { _all: true },
    }),
    prisma.classSession.groupBy({
      by: ["enrollmentId"],
      where: {
        enrollmentId: { in: enrollmentIds },
        status: ClassSessionStatus.COMPLETED,
      },
      _count: { _all: true },
    }),
  ]);

  for (const e of cccRows) {
    counts.set(e.id, { ccc: e.sessionsCompletedInCycle, mcc: 0, tcc: 0 });
  }
  for (const row of mccRows) {
    const existing = counts.get(row.enrollmentId);
    if (existing) existing.mcc = row._count._all;
  }
  for (const row of tccRows) {
    const existing = counts.get(row.enrollmentId);
    if (existing) existing.tcc = row._count._all;
  }

  return counts;
}
