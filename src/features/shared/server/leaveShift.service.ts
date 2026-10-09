import "server-only";

import { prisma } from "@/lib/prisma";
import {
  Prisma,
  ClassSessionStatus,
  CycleStatus,
  LeaveRequestStatus,
  RescheduleRequestStatus,
} from "@prisma/client";

import {
  addDays,
  calendarDateToDate,
  compareDates,
  dateToCalendarDate,
  isValidTimeOfDay,
  todayInPlatformTz,
  type CalendarDate,
} from "@/lib/platformTime";
import { cycleDeadlineDate } from "@/features/shared/utils/cyclePlan";
import { findNextFreeSlot, type FreeSlot } from "@/features/shared/utils/makeupSlots";
import { DEFAULT_SESSION_LENGTH_MINUTES, SESSION_POLICY } from "@/lib/platformConfig";
import { lockCycle, loadSlotContext } from "@/features/shared/server/cycleSlots.service";
import {
  notifySessionsMovedForLeave,
  type LeaveShiftNotice,
} from "@/features/shared/server/notificationTriggers.service";
import { logActivity } from "@/features/shared/server/activityLog.service";
import { closePendingRescheduleRequests } from "@/features/shared/server/rescheduleRequest/close";
import { hasCancelNotice } from "@/features/shared/utils/sessionOutcome";

/**
 * Teacher leave, Part 1C §2: when Admin approves a leave, the
 * teacher's not-yet-started cycle sessions that fall inside it are
 * moved to the next free slots inside each cycle's 45-day window, and
 * the parents are told. A session that has no free slot inside its
 * window is cancelled by the system (no strike — the leave was
 * approved — and no make-up, since none fits); it stays uncounted and
 * is forfeited when the cycle closes.
 *
 * Idempotent and repairable: a moved session is no longer inside the
 * leave, so running this again finds nothing to do. The sweep re-runs
 * it for every approved leave that has not ended, which covers a
 * request that died half-way. Legacy sessions (no `cycleId`) are left
 * alone, as is anything already started, joined, or over.
 *
 * Leave dates are saved as plain dates (UTC midnight of a platform
 * calendar date, see `leaveRequest.service.ts`) and are read here as
 * calendar dates.
 *
 * Phase 1: a class under the cancel-notice window (4 h) is not
 * shifted; it follows the normal teacher cancel rules. Pending
 * reschedule requests touching the leave are closed (and both sides
 * told) before anything moves.
 */

interface ShiftOutcome {
  enrollmentId: string;
  kind: "MOVED" | "CANCELLED";
  from: Date;
  to: Date | null;
}

const PENDING_RESCHEDULE: RescheduleRequestStatus[] = [
  RescheduleRequestStatus.PENDING_TEACHER_APPROVAL,
  RescheduleRequestStatus.PENDING_PARENT_APPROVAL,
];

export async function applyApprovedLeaveToSessions(
  leaveRequestId: string,
  now: Date = new Date(),
): Promise<{ moved: number; cancelled: number }> {
  const leave = await prisma.leaveRequest.findUnique({ where: { id: leaveRequestId } });

  if (!leave || leave.status !== LeaveRequestStatus.APPROVED) {
    return { moved: 0, cancelled: 0 };
  }

  const leaveStart = dateToCalendarDate(leave.startDate);
  const leaveEnd = dateToCalendarDate(leave.endDate);

  const affected = await prisma.classSession.findMany({
    where: {
      teacherId: leave.teacherId,
      cycleId: { not: null },
      status: ClassSessionStatus.SCHEDULED,
      teacherStartedAt: null,
      studentJoinedAt: null,
      startsAt: { gte: new Date(now.getTime() + SESSION_POLICY.cancelNoticeHours * 3_600_000) },
      scheduledDate: { gte: calendarDateToDate(leaveStart), lte: calendarDateToDate(leaveEnd) },
    },
    select: { id: true },
    orderBy: { startsAt: "asc" },
  });

  // Phase 1.2: before anything moves, close every pending reschedule
  // request that this leave makes moot — for a class inside the leave,
  // or asking for a slot inside it — and tell both sides. Idempotent.
  try {
    await closePendingRescheduleRequests(
      {
        teacherId: leave.teacherId,
        OR: [
          { classSessionId: { in: affected.map((a) => a.id) } },
          {
            proposedDate: {
              gte: calendarDateToDate(leaveStart),
              lte: calendarDateToDate(leaveEnd),
            },
          },
        ],
      },
      "TEACHER_LEAVE",
      now,
    );
  } catch (err) {
    console.error(`Closing reschedule requests for leave ${leaveRequestId} failed:`, err);
  }

  const outcomes: ShiftOutcome[] = [];

  for (const { id } of affected) {
    try {
      const outcome = await shiftOneSession(id, leaveStart, leaveEnd, now);
      if (outcome) outcomes.push(outcome);
    } catch (err) {
      // One session failing (say, a slot taken a moment ago) must
      // not stop the rest; the sweep retries it.
      console.error(`Leave shift failed for session ${id}:`, err);
    }
  }

  const byEnrollment = new Map<string, LeaveShiftNotice>();

  for (const outcome of outcomes) {
    const notice = byEnrollment.get(outcome.enrollmentId) ?? {
      enrollmentId: outcome.enrollmentId,
      moved: [],
      cancelled: [],
    };

    if (outcome.kind === "MOVED" && outcome.to) {
      notice.moved.push({ from: outcome.from, to: outcome.to });
    } else {
      notice.cancelled.push(outcome.from);
    }

    byEnrollment.set(outcome.enrollmentId, notice);
  }

  for (const notice of byEnrollment.values()) {
    await notifySessionsMovedForLeave(notice);
  }

  const moved = outcomes.filter((o) => o.kind === "MOVED").length;
  const cancelled = outcomes.length - moved;

  if (outcomes.length > 0) {
    await logActivity({
      action: "SESSION_MOVED_FOR_LEAVE",
      actorRole: "SYSTEM",
      description: `Teacher leave approved: ${moved} class(es) moved, ${cancelled} cancelled (no free slot in the 45-day window).`,
      metadata: { leaveRequestId, teacherId: leave.teacherId, moved, cancelled },
    });
  }

  return { moved, cancelled };
}

function shiftOneSession(
  sessionId: string,
  leaveStart: CalendarDate,
  leaveEnd: CalendarDate,
  now: Date,
): Promise<ShiftOutcome | null> {
  return prisma.$transaction((tx) => shiftOneSessionInTx(tx, sessionId, leaveStart, leaveEnd, now), {
    timeout: 15_000,
  });
}

async function shiftOneSessionInTx(
  tx: Prisma.TransactionClient,
  sessionId: string,
  leaveStart: CalendarDate,
  leaveEnd: CalendarDate,
  now: Date,
): Promise<ShiftOutcome | null> {
  const first = await tx.classSession.findUnique({
    where: { id: sessionId },
    select: { cycleId: true },
  });

  if (!first?.cycleId) return null;

  await lockCycle(tx, first.cycleId);

  // Re-read under the lock: the state may have changed since the
  // list was loaded (started, cancelled, already moved).
  const session = await tx.classSession.findUnique({
    where: { id: sessionId },
    include: {
      enrollment: {
        select: { scheduleTime: true, sessionLengthMinutes: true, isLegacy: true },
      },
      cycle: { select: { startDate: true, status: true } },
    },
  });

  if (
    !session ||
    !session.cycle ||
    session.enrollment.isLegacy ||
    session.status !== ClassSessionStatus.SCHEDULED ||
    session.teacherStartedAt !== null ||
    session.studentJoinedAt !== null ||
    !session.startsAt ||
    !session.endsAt ||
    // Phase 1.6: under the notice window it can't be shifted.
    !hasCancelNotice(session.startsAt, now)
  ) {
    return null;
  }

  const currentDate = dateToCalendarDate(session.scheduledDate);

  if (compareDates(currentDate, leaveStart) < 0 || compareDates(currentDate, leaveEnd) > 0) {
    return null;
  }

  const time = session.scheduledTime;
  const lengthMinutes =
    session.lengthMinutes ??
    session.enrollment.sessionLengthMinutes ??
    DEFAULT_SESSION_LENGTH_MINUTES;

  const deadline = cycleDeadlineDate(dateToCalendarDate(session.cycle.startDate));
  const today = todayInPlatformTz(now);
  const dayAfterCurrent = addDays(currentDate, 1);
  const earliest = compareDates(today, dayAfterCurrent) > 0 ? today : dayAfterCurrent;

  let slot: FreeSlot | null = null;

  if (
    session.cycle.status === CycleStatus.OPEN &&
    isValidTimeOfDay(time) &&
    compareDates(earliest, deadline) <= 0
  ) {
    const context = await loadSlotContext(tx, {
      enrollmentId: session.enrollmentId,
      teacherId: session.teacherId,
      studentId: session.studentId,
      from: earliest,
      to: deadline,
      excludeSessionId: session.id,
    });

    // The leave being applied (or previewed) counts even if it is
    // not saved as APPROVED yet.
    context.leaves = [...context.leaves, { start: leaveStart, end: leaveEnd }];

    // The teacher's own schedule days come from the enrollment.
    const enrollment = await tx.enrollment.findUniqueOrThrow({
      where: { id: session.enrollmentId },
      select: { scheduleDays: true },
    });

    slot = findNextFreeSlot({
      now,
      earliest,
      deadline,
      scheduleDays: enrollment.scheduleDays,
      time,
      lengthMinutes,
      context,
    });
  }

  // Any pending reschedule request for this session is now moot.
  await tx.rescheduleRequest.updateMany({
    where: { classSessionId: session.id, status: { in: PENDING_RESCHEDULE } },
    data: { status: RescheduleRequestStatus.CANCELLED, respondedAt: now },
  });

  if (slot) {
    await tx.classSession.update({
      where: { id: session.id },
      data: {
        scheduledDate: calendarDateToDate(slot.date),
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
      },
    });

    return {
      enrollmentId: session.enrollmentId,
      kind: "MOVED" as const,
      from: session.startsAt,
      to: slot.startsAt,
    };
  }

  // No free slot inside the window: cancelled by the system. No
  // strike and no make-up (nothing fits), so its follow-up is
  // marked done up front.
  await tx.classSession.update({
    where: { id: session.id },
    data: {
      status: ClassSessionStatus.CANCELLED,
      cancelledAt: now,
      cancelledByRole: "SYSTEM",
      cancelReason:
        "Teacher on approved leave and no free slot fits inside the cycle's 45-day window.",
      followUpAppliedAt: now,
    },
  });

  return {
    enrollmentId: session.enrollmentId,
    kind: "CANCELLED" as const,
    from: session.startsAt,
    to: null,
  };
}

export interface LeaveImpact {
  /** Classes that will move to a new slot. */
  moving: number;
  /** Classes with no free slot in their 45-day window: cancelled by the system. */
  cancelling: number;
  /** Classes under the notice window: left alone, normal teacher cancel rules apply. */
  tooSoon: number;
}

/** Thrown on purpose to roll back the preview transaction. */
class PreviewRollback extends Error {
  constructor(readonly impact: LeaveImpact) {
    super("preview rollback");
  }
}

/**
 * Phase 1.7: what approving this leave would do, without doing it.
 * Runs the real shift for every affected class inside one transaction
 * (so each class sees the slots the earlier ones took) and then rolls
 * the whole thing back. Nothing is saved and nobody is notified.
 */
export async function previewLeaveImpact(
  leave: { teacherId: string; startDate: Date; endDate: Date },
  now: Date = new Date(),
): Promise<LeaveImpact> {
  const leaveStart = dateToCalendarDate(leave.startDate);
  const leaveEnd = dateToCalendarDate(leave.endDate);

  const base: Prisma.ClassSessionWhereInput = {
    teacherId: leave.teacherId,
    cycleId: { not: null },
    status: ClassSessionStatus.SCHEDULED,
    teacherStartedAt: null,
    studentJoinedAt: null,
    scheduledDate: { gte: calendarDateToDate(leaveStart), lte: calendarDateToDate(leaveEnd) },
  };

  const noticeCutoff = new Date(now.getTime() + SESSION_POLICY.cancelNoticeHours * 3_600_000);

  const tooSoon = await prisma.classSession.count({
    where: { ...base, startsAt: { gt: now, lt: noticeCutoff } },
  });

  const affected = await prisma.classSession.findMany({
    where: { ...base, startsAt: { gte: noticeCutoff } },
    select: { id: true },
    orderBy: { startsAt: "asc" },
  });

  try {
    await prisma.$transaction(
      async (tx) => {
        let moving = 0;
        let cancelling = 0;

        for (const { id } of affected) {
          const outcome = await shiftOneSessionInTx(tx, id, leaveStart, leaveEnd, now);
          if (outcome?.kind === "MOVED") moving += 1;
          else if (outcome?.kind === "CANCELLED") cancelling += 1;
        }

        throw new PreviewRollback({ moving, cancelling, tooSoon });
      },
      { timeout: 30_000 },
    );
  } catch (err) {
    if (err instanceof PreviewRollback) return err.impact;
    throw err;
  }

  return { moving: 0, cancelling: 0, tooSoon };
}

/**
 * Sweep step: re-applies every approved leave that has not ended yet,
 * so a shift that failed part-way is finished. Cheap when there is
 * nothing to move (one indexed query per leave).
 */
export async function reapplyApprovedLeaves(now: Date = new Date()): Promise<number> {
  const today = todayInPlatformTz(now);

  const leaves = await prisma.leaveRequest.findMany({
    where: {
      status: LeaveRequestStatus.APPROVED,
      endDate: { gte: calendarDateToDate(addDays(today, -1)) },
    },
    select: { id: true },
    orderBy: { startDate: "asc" },
    take: 200,
  });

  let changed = 0;

  for (const { id } of leaves) {
    try {
      const result = await applyApprovedLeaveToSessions(id, now);
      changed += result.moved + result.cancelled;
    } catch (err) {
      console.error(`Re-applying leave ${id} failed:`, err);
    }
  }

  return changed;
}
