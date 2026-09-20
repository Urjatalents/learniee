import { SESSION_POLICY } from "@/lib/platformConfig";
import { compareDates, todayInPlatformTz, type CalendarDate } from "@/lib/platformTime";
import { cycleDeadlineDate } from "@/features/shared/utils/cyclePlan";
import {
  isSessionSettled,
  sessionOutcomeCounts,
  type SessionStatusValue,
} from "@/features/shared/utils/sessionOutcome";

/**
 * When a cycle closes (Part 1C §4) and what its totals are. Pure.
 *
 * A cycle closes when either
 *   - every session is settled (no SCHEDULED / NEEDS_REVIEW session,
 *     and every no-show / teacher cancel has had its follow-up), or
 *   - day 45 of the cycle has passed, whatever is left unfinished.
 *
 * Whatever did not count is forfeited: no refund, no teacher pay.
 */

export interface CloseCheckSession {
  status: SessionStatusValue;
  cancelledByRole: string | null;
  followUpAppliedAt: Date | null;
  endsAt: Date | null;
}

export type CycleCloseDecision =
  | { close: false }
  | {
      close: true;
      reason: "ALL_SESSIONS_FINAL" | "WINDOW_ENDED";
      /** Sessions that counted (paid), never above the paid session count. */
      countedSessions: number;
      /** Paid-for sessions that never counted. */
      forfeitedSessions: number;
    };

export function decideCycleClose(input: {
  sessions: CloseCheckSession[];
  /** The cycle's paid session count. */
  sessionCount: number;
  cycleStart: CalendarDate;
  now: Date;
}): CycleCloseDecision {
  const { sessions, sessionCount, cycleStart, now } = input;

  if (sessions.length === 0) return { close: false };

  const allSettled = sessions.every((s) => isSessionSettled(s));

  let reason: "ALL_SESSIONS_FINAL" | "WINDOW_ENDED" | null = null;

  if (allSettled) {
    reason = "ALL_SESSIONS_FINAL";
  } else if (compareDates(todayInPlatformTz(now), cycleDeadlineDate(cycleStart)) > 0) {
    // Day 45 is over. Give a session that only just ended one sweep
    // delay to be resolved first, so a day-45 late-evening class isn't
    // forfeited for being a few minutes behind.
    const settleAfter = now.getTime() - SESSION_POLICY.sweepDelayMinutes * 60_000;
    const stillResolving = sessions.some(
      (s) => s.status === "SCHEDULED" && (s.endsAt === null || s.endsAt.getTime() > settleAfter),
    );

    if (!stillResolving) reason = "WINDOW_ENDED";
  }

  if (!reason) return { close: false };

  const counted = sessions.filter((s) => sessionOutcomeCounts(s.status) === true).length;
  const countedSessions = Math.min(counted, sessionCount);

  return {
    close: true,
    reason,
    countedSessions,
    forfeitedSessions: Math.max(0, sessionCount - countedSessions),
  };
}
