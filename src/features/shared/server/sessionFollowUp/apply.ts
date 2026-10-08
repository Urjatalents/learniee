import { logActivity } from "@/features/shared/server/activityLog.service";
import { lockCycle } from "@/features/shared/server/cycleSlots.service";
import { notifySessionFollowUp } from "@/features/shared/server/notificationTriggers.service";
import {
    planSessionFollowUp,
    type SessionFollowUpPlan,
    type SessionStatusValue
} from "@/features/shared/utils/sessionOutcome";
import { prisma } from "@/lib/prisma";
import {
    ClassSessionStatus,
    CycleStatus,
    Prisma,
    TeacherStrikeReason,
} from "@prisma/client";
import "server-only";
import { AppliedFollowUp, FollowUpRetryLater, FollowUpSession } from './base';
import { createMakeup } from './makeup';

export async function applySessionFollowUp(sessionId: string, now: Date): Promise<void> {
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
