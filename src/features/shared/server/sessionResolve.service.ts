import "server-only";

import { prisma } from "@/lib/prisma";
import {
  ClassSessionStatus,
  RescheduleRequestStatus,
  type ClassSession,
} from "@prisma/client";

import { SESSION_POLICY } from "@/lib/platformConfig";
import { decideSessionOutcome } from "@/features/shared/utils/sessionOutcome";
import { recomputeEnrollmentCounters } from "@/features/shared/server/classSession.service";
import { notifyClassSessionCompleted } from "@/features/shared/server/notificationTriggers.service";
import { logActivity } from "@/features/shared/server/activityLog.service";
import {
  repairPendingFollowUps,
  runSessionFollowUps,
} from "@/features/shared/server/sessionFollowUp.service";
import { closeDueCycles } from "@/features/shared/server/cycleClose.service";
import { reapplyApprovedLeaves } from "@/features/shared/server/leaveShift.service";

/**
 * `resolveSession()` — the ONLY thing that decides an event-based
 * outcome for a cycle-model session (Part 1B). It reads the three
 * recorded events (teacher Start, parent Join, teacher End) and
 * writes one of COMPLETED / STUDENT_NO_SHOW / TEACHER_NO_SHOW /
 * CANCELLED (system) / NEEDS_REVIEW — see `sessionOutcome.ts` for the
 * table and the overlap rule.
 *
 * It is triggered from three independent places, so no single
 * scheduler or host is load-bearing:
 *   1. the teacher tapping End (`sessionFlow.service.ts`),
 *   2. any read of a session after its end time
 *      (`resolveEndedSessionsForEnrollments`, called by the calendar
 *      and sessions-list reads),
 *   3. a sweep 15 minutes after each scheduled end
 *      (`runSessionSweep`, hit by `/api/cron/resolve-sessions` from
 *      whatever scheduler the current host has).
 *
 * Safe to repeat: the write is a conditional update
 * (`where status = SCHEDULED`), so the second of two concurrent or
 * repeated calls changes nothing. It never touches a session that
 * already has a final outcome (only Part 2A's Admin override may),
 * and never touches NEEDS_REVIEW.
 *
 * Legacy sessions (no cycle) are ignored entirely.
 */

export interface ResolveResult {
  /** True only for the call that actually wrote the outcome. */
  changed: boolean;
  /** The session's status after this call (null if it doesn't exist). */
  status: ClassSessionStatus | null;
}

type ResolvableSession = Pick<
  ClassSession,
  | "id"
  | "status"
  | "cycleId"
  | "startsAt"
  | "endsAt"
  | "teacherStartedAt"
  | "teacherEndedAt"
  | "studentJoinedAt"
  | "resolvedAt"
>;

const PENDING_RESCHEDULE_STATUSES: RescheduleRequestStatus[] = [
  RescheduleRequestStatus.PENDING_TEACHER_APPROVAL,
  RescheduleRequestStatus.PENDING_PARENT_APPROVAL,
];

/** A resolvable session is a cycle-model one (`startsAt`/`endsAt` set) still SCHEDULED. */
function hasCycleTimes(
  session: ResolvableSession,
): session is ResolvableSession & { startsAt: Date; endsAt: Date } {
  return session.cycleId !== null && session.startsAt !== null && session.endsAt !== null;
}

export async function resolveSession(
  sessionId: string,
  now: Date = new Date(),
): Promise<ResolveResult> {
  const session = await prisma.classSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      status: true,
      cycleId: true,
      startsAt: true,
      endsAt: true,
      teacherStartedAt: true,
      teacherEndedAt: true,
      studentJoinedAt: true,
      resolvedAt: true,
    },
  });

  if (!session) {
    return { changed: false, status: null };
  }

  // Legacy session, or already has an outcome: nothing to decide.
  if (!hasCycleTimes(session) || session.status !== ClassSessionStatus.SCHEDULED) {
    return { changed: false, status: session.status };
  }

  // Not over yet: the teacher hasn't ended it and the scheduled end
  // hasn't passed.
  const isOver = session.teacherEndedAt !== null || now >= session.endsAt;

  if (!isOver) {
    return { changed: false, status: session.status };
  }

  const outcome = decideSessionOutcome(
    { startsAt: session.startsAt, endsAt: session.endsAt },
    {
      teacherStartedAt: session.teacherStartedAt,
      teacherEndedAt: session.teacherEndedAt,
      studentJoinedAt: session.studentJoinedAt,
    },
  );

  // The moment the class actually ended — never later than the
  // scheduled end, so a late sweep doesn't stamp "completed at 3am".
  const endedAt = session.teacherEndedAt ?? session.endsAt;
  const completedAt = endedAt < session.endsAt ? endedAt : session.endsAt;

  const changed = await prisma.$transaction(async (tx) => {
    const result = await tx.classSession.updateMany({
      // The guard that makes this safe to repeat and safe against a
      // concurrent resolver: only a still-SCHEDULED, unresolved row
      // can be written.
      where: { id: session.id, status: ClassSessionStatus.SCHEDULED, resolvedAt: null },
      data: {
        status: outcome.status as ClassSessionStatus,
        resolvedAt: now,
        overlapSeconds: outcome.overlapSeconds,
        ...(outcome.status === "COMPLETED"
          ? { completedAt, completedByRole: "SYSTEM" }
          : {}),
        ...(outcome.cancelledByRole
          ? {
              cancelledAt: now,
              cancelledByRole: outcome.cancelledByRole,
              cancelReason: "Nobody joined this session.",
            }
          : {}),
      },
    });

    if (result.count === 0) {
      return false;
    }

    // A pending reschedule request for a session that has now been
    // decided can never be approved — close it instead of leaving it
    // dangling in both inboxes.
    await tx.rescheduleRequest.updateMany({
      where: {
        classSessionId: session.id,
        status: { in: PENDING_RESCHEDULE_STATUSES },
      },
      data: { status: RescheduleRequestStatus.CANCELLED, respondedAt: now },
    });

    return true;
  });

  if (!changed) {
    const current = await prisma.classSession.findUnique({
      where: { id: session.id },
      select: { status: true },
    });

    return { changed: false, status: current?.status ?? null };
  }

  await afterOutcomeWritten(session.id, outcome.status);

  return { changed: true, status: outcome.status as ClassSessionStatus };
}

/**
 * Everything that follows a newly written outcome. Runs after the
 * outcome is committed and must not throw — the outcome is already
 * final, and a failure here is repaired by `runSessionSweep`
 * (`countersAppliedAt` stays null until the counters really ran).
 */
async function afterOutcomeWritten(sessionId: string, status: string) {
  try {
    if (status === "COMPLETED") {
      await applyCompletedSessionEffects(sessionId);
    } else {
      await logActivity({
        action: "CLASS_SESSION_OUTCOME",
        actorRole: "SYSTEM",
        description: `Class session resolved as ${status.toLowerCase().replace(/_/g, " ")}.`,
        metadata: { sessionId, status },
      });
    }

    // Part 1C: counters for the other counted outcomes, the follow-up
    // (make-up, strike, Admin alert, parent notice) and the cycle
    // close check. Each is applied once and never throws.
    await runSessionFollowUps(sessionId);
  } catch (err) {
    console.error(`Session ${sessionId} follow-up after resolve failed:`, err);
  }
}

/**
 * Feeds a COMPLETED cycle session into the progress counters
 * (`recomputeEnrollmentCounters`, which since Part 1C counts per
 * cycle and no longer writes the ledger — cycle close does). It
 * derives everything from live session rows, so running it again is
 * harmless; `countersAppliedAt` just records that it ran so the
 * sweep only repairs sessions where it didn't.
 */
async function applyCompletedSessionEffects(sessionId: string) {
  const session = await prisma.classSession.findUnique({
    where: { id: sessionId },
    select: { id: true, enrollmentId: true, status: true, countersAppliedAt: true },
  });

  if (
    !session ||
    session.status !== ClassSessionStatus.COMPLETED ||
    session.countersAppliedAt !== null
  ) {
    return;
  }

  await recomputeEnrollmentCounters(session.enrollmentId);

  const marked = await prisma.classSession.updateMany({
    where: { id: sessionId, countersAppliedAt: null },
    data: { countersAppliedAt: new Date() },
  });

  // Only the call that marked it notifies, so a repair never
  // double-notifies.
  if (marked.count > 0) {
    await notifyClassSessionCompleted(sessionId);

    await logActivity({
      action: "CLASS_SESSION_COMPLETED",
      actorRole: "SYSTEM",
      description: "Class session completed (both joined, overlap of at least 50%).",
      metadata: { sessionId, enrollmentId: session.enrollmentId },
    });
  }
}

/**
 * Read-time resolution: before any read that lists sessions for
 * these enrollments, resolve every cycle session whose scheduled end
 * has passed and that nothing has resolved yet. One indexed query
 * when there is nothing to do.
 */
export async function resolveEndedSessionsForEnrollments(
  enrollmentIds: string[],
  now: Date = new Date(),
): Promise<number> {
  if (enrollmentIds.length === 0) return 0;

  const due = await prisma.classSession.findMany({
    where: {
      enrollmentId: { in: enrollmentIds },
      status: ClassSessionStatus.SCHEDULED,
      cycleId: { not: null },
      endsAt: { lte: now },
    },
    select: { id: true },
    take: 200,
  });

  let changed = 0;

  for (const { id } of due) {
    try {
      const result = await resolveSession(id, now);
      if (result.changed) changed += 1;
    } catch (err) {
      // One bad row must not break the read that triggered this.
      console.error(`Read-time resolve failed for session ${id}:`, err);
    }
  }

  return changed;
}

const SWEEP_BATCH_SIZE = 500;
/** Don't repair a just-resolved session — its own request is probably still applying it. */
const REPAIR_MIN_AGE_MS = 2 * 60_000;

export interface SessionSweepResult {
  resolved: number;
  repaired: number;
  /** Part 1C: follow-ups (make-up / strike / notices) applied late. */
  followUpsRepaired: number;
  /** Part 1C: sessions moved or cancelled because of approved teacher leave. */
  leaveSessionsShifted: number;
  /** Part 1C: cycles closed by this run. */
  cyclesClosed: number;
  /** True if a full batch was found — more work may remain for the next run. */
  moreRemaining: boolean;
}

/**
 * The backstop sweep: resolves any session still unresolved
 * `sweepDelayMinutes` (15) after its scheduled end, and re-applies
 * the counters for any COMPLETED session whose request died before
 * doing so. Idempotent — run it as often or as rarely as the host's
 * scheduler allows; correctness never depends on it (End and reads
 * resolve too), it only bounds how long a forgotten session can sit
 * unresolved.
 */
export async function runSessionSweep(now: Date = new Date()): Promise<SessionSweepResult> {
  const cutoff = new Date(now.getTime() - SESSION_POLICY.sweepDelayMinutes * 60_000);

  const due = await prisma.classSession.findMany({
    where: {
      status: ClassSessionStatus.SCHEDULED,
      cycleId: { not: null },
      endsAt: { lte: cutoff },
    },
    select: { id: true },
    orderBy: { endsAt: "asc" },
    take: SWEEP_BATCH_SIZE,
  });

  let resolved = 0;

  for (const { id } of due) {
    try {
      const result = await resolveSession(id, now);
      if (result.changed) resolved += 1;
    } catch (err) {
      console.error(`Sweep resolve failed for session ${id}:`, err);
    }
  }

  const unapplied = await prisma.classSession.findMany({
    where: {
      status: ClassSessionStatus.COMPLETED,
      cycleId: { not: null },
      resolvedAt: { not: null, lte: new Date(now.getTime() - REPAIR_MIN_AGE_MS) },
      countersAppliedAt: null,
    },
    select: { id: true },
    take: SWEEP_BATCH_SIZE,
  });

  let repaired = 0;

  for (const { id } of unapplied) {
    try {
      await applyCompletedSessionEffects(id);
      repaired += 1;
    } catch (err) {
      console.error(`Sweep repair failed for session ${id}:`, err);
    }
  }

  // Part 1C, in dependency order: finish any follow-up that didn't
  // apply, finish any leave shift, and only then close what is due —
  // a cycle waits for its follow-ups, so closing goes last. Each step
  // is idempotent and isolated: one failing must not stop the rest.
  let followUpsRepaired = 0;
  let leaveSessionsShifted = 0;
  let cyclesClosed = 0;
  let closeBacklog = false;

  try {
    followUpsRepaired = await repairPendingFollowUps(now);
  } catch (err) {
    console.error("Sweep follow-up repair failed:", err);
  }

  try {
    leaveSessionsShifted = await reapplyApprovedLeaves(now);
  } catch (err) {
    console.error("Sweep leave re-apply failed:", err);
  }

  try {
    const closing = await closeDueCycles(now);
    cyclesClosed = closing.closed;
    closeBacklog = closing.moreRemaining;
  } catch (err) {
    console.error("Sweep cycle close failed:", err);
  }

  return {
    resolved,
    repaired,
    followUpsRepaired,
    leaveSessionsShifted,
    cyclesClosed,
    moreRemaining:
      due.length === SWEEP_BATCH_SIZE || unapplied.length === SWEEP_BATCH_SIZE || closeBacklog,
  };
}
