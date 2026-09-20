import { SESSION_POLICY } from "@/lib/platformConfig";

/**
 * The session-flow rules of Part 1B, as pure functions (no database,
 * no clock of their own — every function takes `now`). Shared by the
 * server (`sessionFlow.service.ts`, `sessionResolve.service.ts`,
 * `rescheduleRequest.service.ts`) and the client (the Start / Join /
 * End buttons), so a button is enabled by exactly the rule the server
 * enforces.
 *
 * Only cycle-model sessions (those with `startsAt`/`endsAt`) use any
 * of this. Legacy sessions never reach it.
 *
 * Outcome table (Part 1B §3):
 *
 *   both joined, overlap >= 50%      COMPLETED        counts, paid
 *   teacher there, student absent    STUDENT_NO_SHOW  counts, paid
 *   student there, teacher absent    TEACHER_NO_SHOW  does not count
 *   nobody joined                    CANCELLED (system) does not count
 *   both joined, overlap < 50%       NEEDS_REVIEW     pending (Admin)
 *   parent cancels 4h+ ahead         CANCELLED        does not count
 *   parent cancels under 4h          CANCELLED_LATE   counts, paid
 *   teacher cancels                  CANCELLED        does not count
 *
 * The last three rows are set by the cancel action, not by resolve.
 */

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

/** ClassSessionStatus values, as plain strings so client code needn't import Prisma. */
export type SessionStatusValue =
  | "SCHEDULED"
  | "COMPLETED"
  | "CANCELLED"
  | "MISSED"
  | "STUDENT_NO_SHOW"
  | "TEACHER_NO_SHOW"
  | "CANCELLED_LATE"
  | "NEEDS_REVIEW";

/** The statuses `resolveSession()` itself can write. */
export type ResolvedStatus = Extract<
  SessionStatusValue,
  "COMPLETED" | "STUDENT_NO_SHOW" | "TEACHER_NO_SHOW" | "CANCELLED" | "NEEDS_REVIEW"
>;

export type SessionActorRole = "TEACHER" | "PARENT";

export interface SessionTimes {
  startsAt: Date;
  endsAt: Date;
}

export interface SessionEvents {
  teacherStartedAt: Date | null;
  teacherEndedAt: Date | null;
  studentJoinedAt: Date | null;
}

/** When Start (teacher) / Join (parent) opens — 10 minutes before the start. */
export function joinOpensAt(startsAt: Date): Date {
  return new Date(startsAt.getTime() - SESSION_POLICY.joinOpensMinutesBefore * MINUTE_MS);
}

/** From this instant a teacher may end a session the student never joined ("student absent"). */
export function studentAbsentFrom(startsAt: Date): Date {
  return new Date(startsAt.getTime() + SESSION_POLICY.graceMinutes * MINUTE_MS);
}

/** Start/Join is possible from 10 minutes before the start until the scheduled end. */
export function isJoinWindowOpen(times: SessionTimes, now: Date): boolean {
  return now >= joinOpensAt(times.startsAt) && now < times.endsAt;
}

/**
 * Milliseconds both sides were present, measured inside the
 * scheduled session only (time before the start or after the end
 * never counts, and never counts for more than the session length).
 *
 * Presence: the teacher from Start to End; the student from Join
 * until the session ends (there is no "leave" event, so the student
 * stays present until the teacher taps End). A teacher who never
 * tapped End is treated as present until the scheduled end.
 */
export function measureOverlapMs(times: SessionTimes, events: SessionEvents): number {
  if (!events.teacherStartedAt || !events.studentJoinedAt) return 0;

  const from = Math.max(
    events.teacherStartedAt.getTime(),
    events.studentJoinedAt.getTime(),
    times.startsAt.getTime(),
  );
  const to = Math.min(
    (events.teacherEndedAt ?? times.endsAt).getTime(),
    times.endsAt.getTime(),
  );

  return Math.max(0, to - from);
}

export interface SessionOutcomeDecision {
  status: ResolvedStatus;
  /** Whole seconds both sides were present, or null when one side never joined. */
  overlapSeconds: number | null;
  /** Set for the one system cancellation ("nobody joined"). */
  cancelledByRole: "SYSTEM" | null;
}

/** The event-based outcome for a session whose time is up. Pure and deterministic. */
export function decideSessionOutcome(
  times: SessionTimes,
  events: SessionEvents,
): SessionOutcomeDecision {
  const teacherThere = events.teacherStartedAt !== null;
  const studentThere = events.studentJoinedAt !== null;

  if (!teacherThere && !studentThere) {
    return { status: "CANCELLED", overlapSeconds: null, cancelledByRole: "SYSTEM" };
  }

  if (teacherThere && !studentThere) {
    return { status: "STUDENT_NO_SHOW", overlapSeconds: null, cancelledByRole: null };
  }

  if (!teacherThere && studentThere) {
    return { status: "TEACHER_NO_SHOW", overlapSeconds: null, cancelledByRole: null };
  }

  const overlapMs = measureOverlapMs(times, events);
  const lengthMs = times.endsAt.getTime() - times.startsAt.getTime();
  const overlapSeconds = Math.floor(overlapMs / 1000);

  // Integer comparison — no floating-point percentage to round.
  const heldEnough =
    lengthMs > 0 && overlapMs * 100 >= SESSION_POLICY.minOverlapPercent * lengthMs;

  return {
    status: heldEnough ? "COMPLETED" : "NEEDS_REVIEW",
    overlapSeconds,
    cancelledByRole: null,
  };
}

/** Overlap as a whole percentage of the session length, for display. */
export function overlapPercent(times: SessionTimes, overlapSeconds: number | null): number | null {
  if (overlapSeconds === null) return null;

  const lengthSeconds = (times.endsAt.getTime() - times.startsAt.getTime()) / 1000;

  if (lengthSeconds <= 0) return null;

  return Math.min(100, Math.round((overlapSeconds / lengthSeconds) * 100));
}

/**
 * Whether a session in this status counts toward the cycle (and is
 * paid): true = yes, false = no, null = not decided yet (still
 * SCHEDULED, or NEEDS_REVIEW until an Admin decides in Part 2A).
 * Part 1C's counters read this instead of re-deriving the table.
 */
export function sessionOutcomeCounts(status: SessionStatusValue): boolean | null {
  switch (status) {
    case "COMPLETED":
    case "STUDENT_NO_SHOW":
    case "CANCELLED_LATE":
      return true;
    case "TEACHER_NO_SHOW":
    case "CANCELLED":
    case "MISSED":
      return false;
    case "SCHEDULED":
    case "NEEDS_REVIEW":
      return null;
  }
}

/** A session that can no longer change through the normal flow. */
export function isSessionFinal(status: SessionStatusValue): boolean {
  return status !== "SCHEDULED" && status !== "NEEDS_REVIEW";
}

/** Cancel/reschedule need at least this much notice before the start. */
export function hasCancelNotice(startsAt: Date, now: Date): boolean {
  return startsAt.getTime() - now.getTime() >= SESSION_POLICY.cancelNoticeHours * HOUR_MS;
}

/** The status a parent's cancel produces: 4h+ ahead is free, under 4h still counts. */
export function parentCancelStatus(
  startsAt: Date,
  now: Date,
): "CANCELLED" | "CANCELLED_LATE" {
  return hasCancelNotice(startsAt, now) ? "CANCELLED" : "CANCELLED_LATE";
}

export interface SessionActionInput extends SessionTimes, SessionEvents {
  status: SessionStatusValue;
}

export interface SessionActions {
  canStart: boolean;
  canJoin: boolean;
  canEnd: boolean;
  /** True when ending now would end it as "student absent" (the student never joined). */
  endsAsStudentAbsent: boolean;
  canCancel: boolean;
  /** Parent only: cancelling now is inside the 4h window, so the class still counts. */
  cancelIsLate: boolean;
}

/**
 * What the given side may do right now. The API routes enforce
 * exactly these rules (with their own error messages); the pages use
 * this to enable/disable the buttons.
 */
export function getSessionActions(
  role: SessionActorRole,
  session: SessionActionInput,
  now: Date,
): SessionActions {
  const open = session.status === "SCHEDULED";
  const windowOpen = isJoinWindowOpen(session, now);
  const started = session.teacherStartedAt !== null;
  const ended = session.teacherEndedAt !== null;
  const studentJoined = session.studentJoinedAt !== null;

  const canStart = role === "TEACHER" && open && windowOpen && !started && !ended;
  const canJoin = role === "PARENT" && open && windowOpen && !studentJoined && !ended;

  const canEnd =
    role === "TEACHER" &&
    open &&
    started &&
    !ended &&
    (studentJoined || now >= studentAbsentFrom(session.startsAt));

  const canCancel = open && !started && !studentJoined && now < session.startsAt;

  return {
    canStart,
    canJoin,
    canEnd,
    endsAsStudentAbsent: canEnd && !studentJoined,
    canCancel,
    cancelIsLate: role === "PARENT" && canCancel && !hasCancelNotice(session.startsAt, now),
  };
}

export const SESSION_STATUS_LABEL: Record<SessionStatusValue, string> = {
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  MISSED: "Missed",
  STUDENT_NO_SHOW: "Student absent",
  TEACHER_NO_SHOW: "Teacher absent",
  CANCELLED_LATE: "Cancelled (late)",
  NEEDS_REVIEW: "Needs review",
};

/** Tailwind classes for a status pill — one place so every list agrees. */
export const SESSION_STATUS_STYLE: Record<SessionStatusValue, string> = {
  SCHEDULED: "bg-gray-100 text-gray-600",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-600",
  MISSED: "bg-amber-100 text-amber-700",
  STUDENT_NO_SHOW: "bg-orange-100 text-orange-700",
  TEACHER_NO_SHOW: "bg-red-100 text-red-600",
  CANCELLED_LATE: "bg-red-100 text-red-600",
  NEEDS_REVIEW: "bg-amber-100 text-amber-700",
};
