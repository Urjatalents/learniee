import { decideSessionOutcome } from "@/features/shared/utils/sessionOutcome";
import { prisma } from "@/lib/prisma";
import {
    ClassSessionStatus,
    RescheduleRequestStatus,
    type ClassSession,
} from "@prisma/client";
import "server-only";
import { afterOutcomeWritten } from './effects';

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
