import "server-only";

import { prisma } from "@/lib/prisma";
import {
  ClassSessionStatus,
  CycleStatus,
  Prisma,
  TeacherStrikeReason,
} from "@prisma/client";

import { DEFAULT_SESSION_LENGTH_MINUTES } from "@/lib/platformConfig";
import {
  compareDates,
  dateToCalendarDate,
  isValidTimeOfDay,
  todayInPlatformTz,
} from "@/lib/platformTime";
import { cycleDeadlineDate } from "@/features/shared/utils/cyclePlan";
import { findNextFreeSlot, slotScheduledDate } from "@/features/shared/utils/makeupSlots";
import {
  COUNTED_SESSION_STATUSES,
  planSessionFollowUp,
  type SessionFollowUpPlan,
  type SessionStatusValue,
} from "@/features/shared/utils/sessionOutcome";
import { lockCycle, loadSlotContext } from "@/features/shared/server/cycleSlots.service";
import { closeCycleIfDue } from "@/features/shared/server/cycleClose.service";
import { recomputeEnrollmentCounters } from "@/features/shared/server/classSession.service";
import { notifySessionFollowUp } from "@/features/shared/server/notificationTriggers.service";
import { logActivity } from "@/features/shared/server/activityLog.service";

/**
 * Follow-ups after a cycle session reaches a final outcome (Part 1C):
 *
 *   teacher no-show   make-up + strike + Admin alert
 *   nobody joined     make-up
 *   teacher cancel    make-up + strike
 *   student no-show   notice to the parent
 *
 * Each follow-up happens ONCE. The whole database side (claim,
 * make-up, strike) runs in one transaction that starts by setting
 * `ClassSession.followUpAppliedAt` with a conditional update — the
 * request that wins that update does the work, every other request
 * (a repeat, a concurrent trigger, the sweep) finds it already set and
 * does nothing. Make-ups and strikes are also unique per session in
 * the database, so even a bug here could not create a second one.
 * Notifications go out after commit, from the winner only.
 *
 * A session with no make-up that fits inside the cycle's 45 days
 * simply stays uncounted; it is forfeited when the cycle closes.
 *
 * Triggered from the same three places as `resolveSession` (the End
 * tap / cancel, a read after the end time, the sweep) — the sweep
 * calls `repairPendingFollowUps` for anything a request left behind.
 * Never throws: the outcome is already saved.
 */

/** Rolls the transaction back so the sweep retries the whole follow-up later. */
class FollowUpRetryLater extends Error {}

const COUNTED = COUNTED_SESSION_STATUSES as readonly string[];

interface AppliedFollowUp {
  plan: SessionFollowUpPlan;
  makeupStartsAt: Date | null;
  makeupWanted: boolean;
  strikeRecorded: boolean;
  makeupSessionId: string | null;
}

type FollowUpSession = Prisma.ClassSessionGetPayload<{
  include: {
    enrollment: {
      select: {
        isLegacy: true;
        scheduleDays: true;
        scheduleTime: true;
        sessionLengthMinutes: true;
      };
    };
    cycle: { select: { id: true; startDate: true; status: true } };
  };
}>;

/** The single entry point every trigger calls after an outcome is written. */
export async function runSessionFollowUps(
  sessionId: string,
  now: Date = new Date(),
): Promise<void> {
  try {
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
      select: { id: true, status: true, cycleId: true, enrollmentId: true },
    });

    if (!session || !session.cycleId || session.status === ClassSessionStatus.SCHEDULED) {
      return;
    }

    // Counted outcomes other than COMPLETED (student no-show, late
    // cancel) feed the progress counters here; COMPLETED does it in
    // `sessionResolve.service.ts`.
    if (COUNTED.includes(session.status) && session.status !== ClassSessionStatus.COMPLETED) {
      await recomputeEnrollmentCounters(session.enrollmentId);
    }

    await applySessionFollowUp(session.id, now);
    await closeCycleIfDue(session.cycleId, now);
  } catch (err) {
    console.error(`Follow-up for session ${sessionId} failed:`, err);
  }
}

async function applySessionFollowUp(sessionId: string, now: Date): Promise<void> {
  const session = await prisma.classSession.findUnique({
    where: { id: sessionId },
    include: {
      enrollment: {
        select: {
          isLegacy: true,
          scheduleDays: true,
          scheduleTime: true,
          sessionLengthMinutes: true,
        },
      },
      cycle: { select: { id: true, startDate: true, status: true } },
    },
  });

  if (!session || !session.cycle || session.enrollment.isLegacy || session.followUpAppliedAt) {
    return;
  }

  const plan = planSessionFollowUp(
    session.status as SessionStatusValue,
    session.cancelledByRole,
  );

  if (!plan) return;

  let applied: AppliedFollowUp | null;

  try {
    applied = await prisma.$transaction(
      (tx) => applyInTransaction(tx, session, plan, now),
      { timeout: 15_000 },
    );
  } catch (err) {
    if (err instanceof FollowUpRetryLater) {
      // Rolled back on purpose (e.g. another request took the slot at
      // the same moment). The claim was rolled back with it, so the
      // sweep retries the whole follow-up.
      return;
    }

    throw err;
  }

  // Someone else applied it first.
  if (!applied) return;

  const outcome = notificationOutcome(session, plan);

  await notifySessionFollowUp({
    sessionId: session.id,
    outcome,
    makeupStartsAt: applied.makeupStartsAt,
    makeupWanted: applied.makeupWanted,
    strikeRecorded: applied.strikeRecorded,
  });

  if (applied.makeupSessionId) {
    await logActivity({
      action: "SESSION_MAKEUP_CREATED",
      actorRole: "SYSTEM",
      description: `Make-up class scheduled for a ${outcome.toLowerCase().replace(/_/g, " ")} session.`,
      metadata: {
        sessionId: session.id,
        makeupSessionId: applied.makeupSessionId,
        enrollmentId: session.enrollmentId,
        cycleId: session.cycle.id,
        makeupStartsAt: applied.makeupStartsAt?.toISOString() ?? null,
      },
    });
  } else if (applied.makeupWanted) {
    await logActivity({
      action: "CLASS_SESSION_OUTCOME",
      actorRole: "SYSTEM",
      description:
        "No make-up slot fits inside the cycle's 45-day window; the class stays uncounted.",
      metadata: { sessionId: session.id, enrollmentId: session.enrollmentId },
    });
  }

  if (applied.strikeRecorded) {
    await logActivity({
      action: "TEACHER_STRIKE_RECORDED",
      actorRole: "SYSTEM",
      description: `Teacher strike recorded (${plan.strike?.toLowerCase().replace(/_/g, " ")}).`,
      metadata: {
        sessionId: session.id,
        teacherId: session.teacherId,
        reason: plan.strike,
      },
    });
  }
}

function notificationOutcome(session: FollowUpSession, plan: SessionFollowUpPlan) {
  if (session.status === ClassSessionStatus.STUDENT_NO_SHOW) return "STUDENT_NO_SHOW" as const;
  if (session.status === ClassSessionStatus.TEACHER_NO_SHOW) return "TEACHER_NO_SHOW" as const;
  if (plan.strike === "TEACHER_CANCELLED") return "TEACHER_CANCELLED" as const;

  return "NOBODY_JOINED" as const;
}

async function applyInTransaction(
  tx: Prisma.TransactionClient,
  session: FollowUpSession,
  plan: SessionFollowUpPlan,
  now: Date,
): Promise<AppliedFollowUp | null> {
  const cycle = session.cycle!;

  // Serialise with anything else that adds a session to this cycle
  // or closes it.
  await lockCycle(tx, cycle.id);

  // The claim: only the request that flips this from null does the work.
  const claim = await tx.classSession.updateMany({
    where: { id: session.id, followUpAppliedAt: null, status: session.status },
    data: { followUpAppliedAt: now },
  });

  if (claim.count === 0) return null;

  let makeupStartsAt: Date | null = null;
  let makeupSessionId: string | null = null;
  let makeupWanted = false;

  if (plan.makeup) {
    makeupWanted = true;

    const freshCycle = await tx.enrollmentCycle.findUniqueOrThrow({
      where: { id: cycle.id },
      select: { status: true, startDate: true },
    });

    const alreadyHasMakeup = await tx.classSession.findUnique({
      where: { makeupForSessionId: session.id },
      select: { id: true, startsAt: true },
    });

    if (alreadyHasMakeup) {
      makeupSessionId = alreadyHasMakeup.id;
      makeupStartsAt = alreadyHasMakeup.startsAt;
    } else if (freshCycle.status === CycleStatus.OPEN) {
      const created = await createMakeup(tx, session, freshCycle.startDate, now);

      if (created) {
        makeupSessionId = created.id;
        makeupStartsAt = created.startsAt;
      }
    }
  }

  let strikeRecorded = false;

  if (plan.strike) {
    const result = await tx.teacherStrike.createMany({
      data: [
        {
          teacherId: session.teacherId,
          classSessionId: session.id,
          enrollmentId: session.enrollmentId,
          reason:
            plan.strike === "TEACHER_NO_SHOW"
              ? TeacherStrikeReason.TEACHER_NO_SHOW
              : TeacherStrikeReason.TEACHER_CANCELLED,
        },
      ],
      skipDuplicates: true,
    });

    strikeRecorded = result.count > 0;
  }

  return {
    plan,
    makeupStartsAt,
    makeupWanted: makeupWanted && makeupSessionId === null,
    strikeRecorded,
    makeupSessionId,
  };
}

/**
 * Adds one make-up session on the next free slot on or before the
 * cycle's day 45. Returns null if none fits. The make-up is a normal
 * cycle session (next session number, same teacher, student and
 * length) so Start / Join / End, reschedule and counting all work on
 * it unchanged.
 */
async function createMakeup(
  tx: Prisma.TransactionClient,
  session: FollowUpSession,
  cycleStartDate: Date,
  now: Date,
): Promise<{ id: string; startsAt: Date } | null> {
  const { enrollment } = session;
  const time = enrollment.scheduleTime;

  if (!isValidTimeOfDay(time) || enrollment.scheduleDays.length === 0) {
    return null;
  }

  const deadline = cycleDeadlineDate(dateToCalendarDate(cycleStartDate));
  const today = todayInPlatformTz(now);

  if (compareDates(today, deadline) > 0) return null;

  const lengthMinutes =
    session.lengthMinutes ?? enrollment.sessionLengthMinutes ?? DEFAULT_SESSION_LENGTH_MINUTES;

  const context = await loadSlotContext(tx, {
    enrollmentId: session.enrollmentId,
    teacherId: session.teacherId,
    studentId: session.studentId,
    from: today,
    to: deadline,
  });

  const slot = findNextFreeSlot({
    now,
    earliest: today,
    deadline,
    scheduleDays: enrollment.scheduleDays,
    time,
    lengthMinutes,
    context,
  });

  if (!slot) return null;

  const highest = await tx.classSession.aggregate({
    where: { cycleId: session.cycleId },
    _max: { sessionNumber: true },
  });

  const id = crypto.randomUUID();

  const result = await tx.classSession.createMany({
    data: [
      {
        id,
        enrollmentId: session.enrollmentId,
        cycleId: session.cycleId,
        sessionNumber: (highest._max.sessionNumber ?? 0) + 1,
        teacherId: session.teacherId,
        studentId: session.studentId,
        parentId: session.parentId,
        scheduledDate: slotScheduledDate(slot),
        scheduledTime: time,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        lengthMinutes,
        makeupForSessionId: session.id,
      },
    ],
    skipDuplicates: true,
  });

  // A unique clash (another request took this date or session
  // number a moment ago): roll everything back and let the sweep retry.
  if (result.count === 0) {
    throw new FollowUpRetryLater();
  }

  return { id, startsAt: slot.startsAt };
}

const REPAIR_MIN_AGE_MS = 2 * 60_000;
const REPAIR_BATCH_SIZE = 200;

/**
 * Sweep step: applies the follow-up for any final outcome whose
 * request died (or was rolled back) before applying it. Only touches
 * sessions that actually have a follow-up and are at least two
 * minutes old, so it never races the request that just wrote them.
 */
export async function repairPendingFollowUps(now: Date = new Date()): Promise<number> {
  const pending = await prisma.classSession.findMany({
    where: {
      cycleId: { not: null },
      followUpAppliedAt: null,
      updatedAt: { lte: new Date(now.getTime() - REPAIR_MIN_AGE_MS) },
      OR: [
        {
          status: {
            in: [ClassSessionStatus.TEACHER_NO_SHOW, ClassSessionStatus.STUDENT_NO_SHOW],
          },
        },
        {
          status: ClassSessionStatus.CANCELLED,
          cancelledByRole: { in: ["TEACHER", "SYSTEM"] },
        },
      ],
    },
    select: { id: true },
    orderBy: { updatedAt: "asc" },
    take: REPAIR_BATCH_SIZE,
  });

  for (const { id } of pending) {
    await runSessionFollowUps(id, now);
  }

  return pending.length;
}
