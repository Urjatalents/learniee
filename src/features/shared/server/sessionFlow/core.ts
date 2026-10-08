import { acceptExpiredConfirmationsQuietly } from "@/features/shared/server/sessionConfirmation.service";
import { resolveSession } from "@/features/shared/server/sessionResolve.service";
import {
    type ConfirmationInput
} from "@/features/shared/utils/outcomeConfirmation";
import {
    type SessionActorRole
} from "@/features/shared/utils/sessionOutcome";
import { prisma } from "@/lib/prisma";
import {
    ClassSessionStatus,
    RescheduleRequestStatus,
    type Prisma
} from "@prisma/client";
import "server-only";

/**
 * The live side of a cycle-model session (Part 1B): the teacher taps
 * Start, the parent taps Join, the teacher taps End — each time is
 * saved once and never overwritten. This file only RECORDS events;
 * what they mean (completed / no-show / needs review …) is decided
 * solely by `resolveSession()` in `sessionResolve.service.ts`.
 *
 * Also the two cancel actions (parent, teacher), which are the only
 * other way a cycle session gets its outcome.
 *
 * After the class (Part 2A): the teacher's short summary, and the
 * parent's "All good" / "Report a problem" within 48 hours of the
 * outcome becoming final (no action = accepted, see
 * `sessionConfirmation.service.ts`).
 *
 * Legacy sessions are refused here (409) — they keep their old
 * mark-complete path untouched.
 */

export class SessionFlowError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
export interface SessionActor {
  role: SessionActorRole;
  /** `Teacher.id` or `ParentProfile.id`, matching `role`. */
  id: string;
}
const flowInclude = {
  student: { select: { firstName: true, visibleName: true } },
  teacher: { select: { firstName: true, lastName: true, visibleName: true, email: true } },
  enrollment: {
    select: { subject: true, course: { select: { courseTitle: true } } },
  },
  cycle: { select: { startDate: true } },
} satisfies Prisma.ClassSessionInclude;
export type FlowSession = Prisma.ClassSessionGetPayload<{ include: typeof flowInclude }>;
type CycleFlowSession = FlowSession & { startsAt: Date; endsAt: Date };
export const PENDING_RESCHEDULE_STATUSES: RescheduleRequestStatus[] = [
  RescheduleRequestStatus.PENDING_TEACHER_APPROVAL,
  RescheduleRequestStatus.PENDING_PARENT_APPROVAL,
];
export function isCycleSession(session: FlowSession): session is CycleFlowSession {
  return session.cycleId !== null && session.startsAt !== null && session.endsAt !== null;
}
export function requireCycleSession(session: FlowSession): CycleFlowSession {
  if (!isCycleSession(session)) {
    throw new SessionFlowError(
      "This session uses the older completion flow, so Start, Join, End and Cancel aren't available for it.",
      409,
    );
  }

  return session;
}
export async function loadSession(sessionId: string, actor: SessionActor): Promise<FlowSession> {
  const session = await prisma.classSession.findFirst({
    where:
      actor.role === "TEACHER"
        ? { id: sessionId, teacherId: actor.id }
        : { id: sessionId, parentId: actor.id },
    include: flowInclude,
  });

  if (!session) {
    throw new SessionFlowError("Class session not found, or doesn't belong to you.", 404);
  }

  return session;
}
/**
 * Loads the session, and if its time is up (or the teacher already
 * ended it) makes sure it has its outcome first — the "read after its
 * end time" trigger of `resolveSession`.
 */
export async function loadAndSettle(
  sessionId: string,
  actor: SessionActor,
  now: Date,
): Promise<FlowSession> {
  let session = await loadSession(sessionId, actor);

  if (
    isCycleSession(session) &&
    session.status === ClassSessionStatus.SCHEDULED &&
    (session.teacherEndedAt !== null || now >= session.endsAt)
  ) {
    const result = await resolveSession(session.id, now);

    if (result.changed) {
      session = await loadSession(sessionId, actor);
    }
  }

  // Part 2A: a final outcome whose 48 hours passed with no action is
  // accepted now (the "read" trigger of `acceptExpiredConfirmations`).
  if (
    isCycleSession(session) &&
    session.status !== ClassSessionStatus.SCHEDULED &&
    session.settledAt === null &&
    session.confirmation === null
  ) {
    const accepted = await acceptExpiredConfirmationsQuietly(now, { sessionId: session.id });

    if (accepted > 0) {
      session = await loadSession(sessionId, actor);
    }
  }

  return session;
}
export function toConfirmationInput(session: CycleFlowSession): ConfirmationInput {
  return {
    status: session.status,
    confirmation: session.confirmation,
    settledAt: session.settledAt,
    resolvedAt: session.resolvedAt,
    cancelledAt: session.cancelledAt,
    endsAt: session.endsAt,
  };
}
export function displayName(p: { firstName: string; lastName?: string; visibleName: string | null }) {
  return p.visibleName?.trim() || `${p.firstName} ${p.lastName ?? ""}`.trim();
}
export function iso(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}
