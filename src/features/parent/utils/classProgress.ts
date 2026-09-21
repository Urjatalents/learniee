import { SESSION_POLICY } from "@/lib/platformConfig";
import {
  dateToCalendarDate,
  daysBetween,
  parseDateKey,
  todayInPlatformTz,
  toDateKey,
} from "@/lib/platformTime";
import { cycleDeadlineDate, formatDayMonth } from "@/features/shared/utils/cyclePlan";
import {
  canParentRespond,
  getConfirmationState,
  type ConfirmationInput,
  type ConfirmationValue,
} from "@/features/shared/utils/outcomeConfirmation";
import {
  COUNTED_SESSION_STATUSES,
  type SessionStatusValue,
} from "@/features/shared/utils/sessionOutcome";
import type {
  ClassSessionItem,
  CycleProgressView,
  NextClassView,
  ParentClassSummary,
} from "@/features/parent/types/myClasses";

/**
 * The My Classes page's rules as pure functions (no database, no
 * clock of their own): which cycle is "current", what "Session 3 of
 * 9" and "days left of 45" mean, and how one session becomes a row.
 * The server service feeds these plain rows; nothing here is
 * Prisma-specific.
 */

export interface CycleInput {
  id: string;
  cycleNumber: number;
  status: "OPEN" | "CLOSED";
  startDate: Date;
  endDate: Date;
  sessionCount: number;
}

export interface SessionInput {
  id: string;
  cycleId: string | null;
  sessionNumber: number | null;
  status: SessionStatusValue;
  cancelledByRole: string | null;
  makeupForSessionId: string | null;
  scheduledDate: Date;
  startsAt: Date | null;
  endsAt: Date | null;
  confirmation: ConfirmationValue | null;
  settledAt: Date | null;
  resolvedAt: Date | null;
  cancelledAt: Date | null;
  teacherSummary: string | null;
  teacherSummaryAt: Date | null;
}

/** A session that has both times — every cycle-model session does. */
export type TimedSession = SessionInput & { startsAt: Date; endsAt: Date };

export function hasTimes(session: SessionInput): session is TimedSession {
  return session.startsAt !== null && session.endsAt !== null;
}

const COUNTED = COUNTED_SESSION_STATUSES as readonly string[];

/** True for the outcomes that count toward a cycle (and are paid). */
export function isCountedStatus(status: SessionStatusValue): boolean {
  return COUNTED.includes(status);
}

/**
 * The cycle the page reports on: the earliest cycle still open
 * (classes of cycle 1 keep happening after the parent has already
 * renewed into cycle 2), otherwise the latest one.
 */
export function pickCurrentCycle<T extends { cycleNumber: number; status: "OPEN" | "CLOSED" }>(
  cycles: T[],
): T | null {
  if (cycles.length === 0) return null;

  const sorted = [...cycles].sort((a, b) => a.cycleNumber - b.cycleNumber);

  return sorted.find((cycle) => cycle.status === "OPEN") ?? sorted[sorted.length - 1];
}

function isUpcoming(session: TimedSession, now: Date): boolean {
  return session.status === "SCHEDULED" && session.endsAt.getTime() > now.getTime();
}

export function buildCycleProgress(
  cycle: CycleInput,
  sessions: TimedSession[],
  now: Date,
): CycleProgressView {
  const inCycle = sessions.filter((session) => session.cycleId === cycle.id);
  const counted = inCycle.filter((session) => isCountedStatus(session.status)).length;
  const hasUpcoming = inCycle.some((session) => isUpcoming(session, now));

  const start = dateToCalendarDate(cycle.startDate);
  const end = dateToCalendarDate(cycle.endDate);
  const deadline = cycleDeadlineDate(start);
  const today = todayInPlatformTz(now);
  const windowDays = SESSION_POLICY.completionWindowDays;

  // Day 1 is the cycle's start date; 0 means it has not started yet.
  const dayOfWindow = Math.min(windowDays, Math.max(0, daysBetween(start, today) + 1));
  const daysLeft = Math.min(windowDays, Math.max(0, daysBetween(today, deadline) + 1));

  return {
    cycleNumber: cycle.cycleNumber,
    status: cycle.status,
    startDate: toDateKey(start),
    endDate: toDateKey(end),
    deadline: toDateKey(deadline),
    sessionCount: cycle.sessionCount,
    countedSessions: counted,
    nextSessionNumber: hasUpcoming && counted < cycle.sessionCount ? counted + 1 : null,
    windowDays,
    dayOfWindow,
    daysLeft,
  };
}

function toConfirmationInput(session: TimedSession): ConfirmationInput {
  return {
    status: session.status,
    confirmation: session.confirmation,
    settledAt: session.settledAt,
    resolvedAt: session.resolvedAt,
    cancelledAt: session.cancelledAt,
    endsAt: session.endsAt,
  };
}

/** One session as a list row. `cycleNumbers` maps a cycle id to its number. */
export function toClassSessionItem(
  session: TimedSession,
  cycleNumbers: Map<string, number>,
  now: Date,
): ClassSessionItem {
  const input = toConfirmationInput(session);
  const confirmation = getConfirmationState(input, now);

  return {
    id: session.id,
    cycleNumber: session.cycleId ? (cycleNumbers.get(session.cycleId) ?? null) : null,
    sessionNumber: session.sessionNumber,
    isMakeup: session.makeupForSessionId !== null,
    scheduledDate: toDateKey(dateToCalendarDate(session.scheduledDate)),
    startsAt: session.startsAt.toISOString(),
    endsAt: session.endsAt.toISOString(),
    status: session.status,
    cancelledByRole: session.cancelledByRole,
    summary: session.teacherSummary,
    summaryUpdatedAt: session.teacherSummaryAt ? session.teacherSummaryAt.toISOString() : null,
    confirmationPhase: confirmation.phase,
    canRespond: canParentRespond(input, now),
    windowEndsAt: confirmation.windowEndsAt ? confirmation.windowEndsAt.toISOString() : null,
  };
}

/** Sessions still to come, soonest first. */
export function upcomingSessions(sessions: TimedSession[], now: Date): TimedSession[] {
  return sessions
    .filter((session) => isUpcoming(session, now))
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

/** The card-sized summary of one enrollment: progress, next class, what needs the parent. */
export function summarizeEnrollment(
  cycles: CycleInput[],
  sessions: SessionInput[],
  now: Date,
): ParentClassSummary {
  const timed = sessions.filter(hasTimes);
  const cycle = pickCurrentCycle(cycles);
  const next = upcomingSessions(timed, now)[0] ?? null;

  const nextClass: NextClassView | null = next
    ? {
        id: next.id,
        startsAt: next.startsAt.toISOString(),
        endsAt: next.endsAt.toISOString(),
        isMakeup: next.makeupForSessionId !== null,
      }
    : null;

  return {
    progress: cycle ? buildCycleProgress(cycle, timed, now) : null,
    nextClass,
    needsResponseCount: timed.filter((session) =>
      canParentRespond(toConfirmationInput(session), now),
    ).length,
  };
}

/** "YYYY-MM-DD" -> "Tue, 5 Mar" (a plain calendar date, no timezone shifting). */
export function formatDateKey(key: string): string {
  const date = parseDateKey(key);

  if (!date) return key;

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(Date.UTC(date.year, date.month - 1, date.day)));
}

/** "YYYY-MM-DD" -> "5 Mar". */
export function formatDateKeyShort(key: string): string {
  const date = parseDateKey(key);

  return date ? formatDayMonth(date) : key;
}

/** "2h 15m", "1d 3h", "4m 10s" — a countdown to `ms` from now. */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;

  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}
