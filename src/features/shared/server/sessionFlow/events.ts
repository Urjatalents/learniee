import { logActivity } from "@/features/shared/server/activityLog.service";
import { runSessionFollowUps } from "@/features/shared/server/sessionFollowUp.service";
import {
    ensureSessionMeeting,
    isCohostConfirmed,
} from "@/features/shared/server/sessionMeeting.service";
import { resolveSession } from "@/features/shared/server/sessionResolve.service";
import type { SessionFlowState } from "@/features/shared/types/sessionFlow";
import {
    getSessionActions,
    joinOpensAt,
    parentCancelStatus,
    studentAbsentFrom,
    type SessionStatusValue
} from "@/features/shared/utils/sessionOutcome";
import { isGoogleMeetEnabled } from "@/lib/googleMeet";
import {
    formatPlatformTime
} from "@/lib/platformTime";
import { prisma } from "@/lib/prisma";
import {
    ClassSessionStatus,
    RescheduleRequestStatus
} from "@prisma/client";
import "server-only";
import { loadAndSettle, PENDING_RESCHEDULE_STATUSES, requireCycleSession, SessionActor, SessionFlowError } from './core';
import { reload, statusLabel, toState } from './state';

/**
 * Teacher taps Start. Opens 10 minutes before the class starts and
 * stays open until its scheduled end. Tapping again keeps the first
 * time — the start time is never overwritten.
 */
export async function startSession(
  sessionId: string,
  teacherId: string,
  now: Date = new Date(),
): Promise<SessionFlowState> {
  const actor: SessionActor = { role: "TEACHER", id: teacherId };
  const session = requireCycleSession(await loadAndSettle(sessionId, actor, now));

  if (session.status !== ClassSessionStatus.SCHEDULED) {
    throw new SessionFlowError(
      `This session is already over (${statusLabel(session.status)}).`,
      409,
    );
  }

  if (session.teacherStartedAt) {
    // Already started: (re)try the Meet room if it's missing, and
    // re-check the co-host if Meet hasn't confirmed it yet. This is
    // also what the teacher's "Retry" button calls.
    if (isGoogleMeetEnabled() && (!session.meetingUri || !isCohostConfirmed(session))) {
      await ensureSessionMeeting(session.id);
      return reload(sessionId, actor, now);
    }

    return toState(session, "TEACHER", now);
  }

  const opensAt = joinOpensAt(session.startsAt);

  if (now < opensAt) {
    throw new SessionFlowError(
      `You can start this session from ${formatPlatformTime(opensAt)}, 10 minutes before it begins.`,
      409,
    );
  }

  await prisma.classSession.updateMany({
    where: {
      id: session.id,
      status: ClassSessionStatus.SCHEDULED,
      teacherStartedAt: null,
      teacherEndedAt: null,
    },
    data: { teacherStartedAt: now },
  });

  // Meet only supplies the room; a failure here never blocks the Start.
  // The co-host is re-verified with Google on every first Start, even if
  // the room was already created by an earlier Join.
  await ensureSessionMeeting(session.id, { force: true });

  return reload(sessionId, actor, now);
}
/**
 * Parent taps Join. Same window as Start: from 10 minutes before the
 * start until the scheduled end, enforced here rather than trusted
 * from the button. Tapping again keeps the first time.
 */
export async function joinSession(
  sessionId: string,
  parentId: string,
  now: Date = new Date(),
): Promise<SessionFlowState> {
  const actor: SessionActor = { role: "PARENT", id: parentId };
  const session = requireCycleSession(await loadAndSettle(sessionId, actor, now));

  if (session.status !== ClassSessionStatus.SCHEDULED) {
    throw new SessionFlowError(
      `This session is already over (${statusLabel(session.status)}).`,
      409,
    );
  }

  if (session.studentJoinedAt) {
    // Already joined: only (re)try the Meet room if it's missing.
    if (isGoogleMeetEnabled() && !session.meetingUri) {
      await ensureSessionMeeting(session.id);
      return reload(sessionId, actor, now);
    }

    return toState(session, "PARENT", now);
  }

  if (session.teacherEndedAt) {
    throw new SessionFlowError("The teacher has already ended this session.", 409);
  }

  const opensAt = joinOpensAt(session.startsAt);

  if (now < opensAt) {
    throw new SessionFlowError(
      `You can join this session from ${formatPlatformTime(opensAt)}, 10 minutes before it begins.`,
      409,
    );
  }

  await prisma.classSession.updateMany({
    where: {
      id: session.id,
      status: ClassSessionStatus.SCHEDULED,
      studentJoinedAt: null,
      teacherEndedAt: null,
    },
    data: { studentJoinedAt: now },
  });

  // Meet only supplies the room; a failure here never blocks the Join.
  await ensureSessionMeeting(session.id);

  return reload(sessionId, actor, now);
}
/**
 * Teacher taps End. If the student never joined, that is only
 * possible from 10 minutes after the start ("student absent").
 * Records the end time, then hands the decision to `resolveSession`.
 * Safe to tap twice — the second tap just returns the outcome.
 */
export async function endSession(
  sessionId: string,
  teacherId: string,
  now: Date = new Date(),
): Promise<SessionFlowState> {
  const actor: SessionActor = { role: "TEACHER", id: teacherId };
  const session = requireCycleSession(await loadAndSettle(sessionId, actor, now));

  // Already decided (a double tap, or the time ran out first): show
  // the outcome instead of an error.
  if (session.status !== ClassSessionStatus.SCHEDULED) {
    return toState(session, "TEACHER", now);
  }

  if (!session.teacherStartedAt) {
    throw new SessionFlowError("Start the session before ending it.", 409);
  }

  if (!session.studentJoinedAt) {
    const absentFrom = studentAbsentFrom(session.startsAt);

    if (now < absentFrom) {
      throw new SessionFlowError(
        `The student hasn't joined yet. You can end the session as "student absent" from ${formatPlatformTime(absentFrom)}.`,
        409,
      );
    }
  }

  await prisma.classSession.updateMany({
    where: { id: session.id, status: ClassSessionStatus.SCHEDULED, teacherEndedAt: null },
    data: { teacherEndedAt: now },
  });

  await resolveSession(session.id, now);

  return reload(sessionId, actor, now);
}
/**
 * Cancel a session before it starts — the only way a cycle session
 * gets an outcome other than through `resolveSession`:
 *
 *   parent, 4h+ ahead   -> CANCELLED       (does not count)
 *   parent, under 4h    -> CANCELLED_LATE  (still counts, paid)
 *   teacher, any time   -> CANCELLED       (does not count)
 *
 * The follow-ups (make-up / strike) are applied right after, by
 * `runSessionFollowUps` (Part 1C). A session that has started (or
 * that the student has joined) can't be cancelled any more — its
 * outcome comes from the events instead.
 */
export async function cancelSession(
  sessionId: string,
  actor: SessionActor,
  reason: string | null,
  now: Date = new Date(),
): Promise<SessionFlowState> {
  const session = requireCycleSession(await loadAndSettle(sessionId, actor, now));

  if (session.status !== ClassSessionStatus.SCHEDULED) {
    throw new SessionFlowError(
      `This session is already ${statusLabel(session.status)} and can't be cancelled.`,
      409,
    );
  }

  const actions = getSessionActions(actor.role, session, now);

  if (!actions.canCancel) {
    throw new SessionFlowError(
      session.teacherStartedAt || session.studentJoinedAt || now >= session.startsAt
        ? "This session has already started, so it can't be cancelled any more."
        : "This session can't be cancelled right now.",
      409,
    );
  }

  const status =
    actor.role === "TEACHER"
      ? ClassSessionStatus.CANCELLED
      : (parentCancelStatus(session.startsAt, now) as ClassSessionStatus);

  const cleanReason = reason?.trim().slice(0, 500) || null;

  const changed = await prisma.$transaction(async (tx) => {
    const result = await tx.classSession.updateMany({
      // Re-checked inside the write so a Start/Join that lands at the
      // same moment can't be overwritten by a cancel.
      where: {
        id: session.id,
        status: ClassSessionStatus.SCHEDULED,
        teacherStartedAt: null,
        studentJoinedAt: null,
      },
      data: {
        status,
        cancelledAt: now,
        cancelledByRole: actor.role,
        cancelReason: cleanReason,
      },
    });

    if (result.count === 0) return false;

    await tx.rescheduleRequest.updateMany({
      where: { classSessionId: session.id, status: { in: PENDING_RESCHEDULE_STATUSES } },
      data: { status: RescheduleRequestStatus.CANCELLED, respondedAt: now },
    });

    return true;
  });

  if (!changed) {
    throw new SessionFlowError(
      "This session just started or changed, so it can't be cancelled.",
      409,
    );
  }

  await logActivity({
    action: "CLASS_SESSION_OUTCOME",
    actorRole: actor.role,
    actorId: actor.id,
    description: `Class session cancelled by the ${actor.role.toLowerCase()} (${statusLabel(
      status as SessionStatusValue,
    )}).`,
    metadata: { sessionId: session.id, status, reason: cleanReason },
  });

  // Part 1C: a teacher cancel gets its make-up and strike, a late
  // parent cancel feeds the counters, and the cycle close check runs.
  await runSessionFollowUps(session.id, now);

  return reload(sessionId, actor, now);
}
