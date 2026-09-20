import "server-only";

import { prisma } from "@/lib/prisma";
import {
  ClassSessionStatus,
  RescheduleRequestStatus,
  type Prisma,
} from "@prisma/client";

import {
  dateToCalendarDate,
  formatPlatformTime,
  toDateKey,
} from "@/lib/platformTime";
import { cycleDeadlineDate } from "@/features/shared/utils/cyclePlan";
import {
  getSessionActions,
  joinOpensAt,
  overlapPercent,
  parentCancelStatus,
  SESSION_STATUS_LABEL,
  studentAbsentFrom,
  type SessionActorRole,
  type SessionStatusValue,
} from "@/features/shared/utils/sessionOutcome";
import type { SessionFlowState } from "@/features/shared/types/sessionFlow";
import { resolveSession } from "@/features/shared/server/sessionResolve.service";
import { runSessionFollowUps } from "@/features/shared/server/sessionFollowUp.service";
import { logActivity } from "@/features/shared/server/activityLog.service";

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
  teacher: { select: { firstName: true, lastName: true, visibleName: true } },
  enrollment: {
    select: { subject: true, course: { select: { courseTitle: true } } },
  },
  cycle: { select: { startDate: true } },
} satisfies Prisma.ClassSessionInclude;

type FlowSession = Prisma.ClassSessionGetPayload<{ include: typeof flowInclude }>;
type CycleFlowSession = FlowSession & { startsAt: Date; endsAt: Date };

const PENDING_RESCHEDULE_STATUSES: RescheduleRequestStatus[] = [
  RescheduleRequestStatus.PENDING_TEACHER_APPROVAL,
  RescheduleRequestStatus.PENDING_PARENT_APPROVAL,
];

function isCycleSession(session: FlowSession): session is CycleFlowSession {
  return session.cycleId !== null && session.startsAt !== null && session.endsAt !== null;
}

function requireCycleSession(session: FlowSession): CycleFlowSession {
  if (!isCycleSession(session)) {
    throw new SessionFlowError(
      "This session uses the older completion flow, so Start, Join, End and Cancel aren't available for it.",
      409,
    );
  }

  return session;
}

async function loadSession(sessionId: string, actor: SessionActor): Promise<FlowSession> {
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
async function loadAndSettle(
  sessionId: string,
  actor: SessionActor,
  now: Date,
): Promise<FlowSession> {
  const session = await loadSession(sessionId, actor);

  if (
    isCycleSession(session) &&
    session.status === ClassSessionStatus.SCHEDULED &&
    (session.teacherEndedAt !== null || now >= session.endsAt)
  ) {
    const result = await resolveSession(session.id, now);

    if (result.changed) {
      return loadSession(sessionId, actor);
    }
  }

  return session;
}

function displayName(p: { firstName: string; lastName?: string; visibleName: string | null }) {
  return p.visibleName?.trim() || `${p.firstName} ${p.lastName ?? ""}`.trim();
}

function iso(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

function toState(session: FlowSession, role: SessionActorRole, now: Date): SessionFlowState {
  const otherPartyName =
    role === "TEACHER" ? displayName(session.student) : displayName(session.teacher);
  const courseTitle = session.enrollment.course.courseTitle ?? session.enrollment.subject ?? null;

  if (!isCycleSession(session)) {
    const d = new Date(session.scheduledDate);

    return {
      id: session.id,
      isCycleSession: false,
      status: session.status,
      scheduledDate: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate(),
      ).padStart(2, "0")}`,
      scheduledTime: session.scheduledTime,
      startsAt: null,
      endsAt: null,
      joinOpensAt: null,
      studentAbsentFrom: null,
      teacherStartedAt: null,
      teacherEndedAt: null,
      studentJoinedAt: null,
      cancelledByRole: null,
      overlapPercent: null,
      cycleDeadline: null,
      otherPartyName,
      courseTitle,
      serverNow: now.toISOString(),
    };
  }

  const times = { startsAt: session.startsAt, endsAt: session.endsAt };

  return {
    id: session.id,
    isCycleSession: true,
    status: session.status,
    scheduledDate: toDateKey(dateToCalendarDate(session.scheduledDate)),
    scheduledTime: session.scheduledTime,
    startsAt: iso(session.startsAt),
    endsAt: iso(session.endsAt),
    joinOpensAt: iso(joinOpensAt(session.startsAt)),
    studentAbsentFrom: iso(studentAbsentFrom(session.startsAt)),
    teacherStartedAt: iso(session.teacherStartedAt),
    teacherEndedAt: iso(session.teacherEndedAt),
    studentJoinedAt: iso(session.studentJoinedAt),
    cancelledByRole: session.cancelledByRole,
    overlapPercent: overlapPercent(times, session.overlapSeconds),
    cycleDeadline: session.cycle
      ? toDateKey(cycleDeadlineDate(dateToCalendarDate(session.cycle.startDate)))
      : null,
    otherPartyName,
    courseTitle,
    serverNow: now.toISOString(),
  };
}

function statusLabel(status: SessionStatusValue) {
  return SESSION_STATUS_LABEL[status].toLowerCase();
}

/** The page's read: settles an ended session first, then returns its state. */
export async function getSessionFlowState(
  sessionId: string,
  actor: SessionActor,
  now: Date = new Date(),
): Promise<SessionFlowState> {
  const session = await loadAndSettle(sessionId, actor, now);

  return toState(session, actor.role, now);
}

async function reload(sessionId: string, actor: SessionActor, now: Date) {
  return toState(await loadSession(sessionId, actor), actor.role, now);
}

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
