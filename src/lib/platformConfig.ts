/**
 * Platform-wide scheduling config (Part 1A of the cycle/session
 * rework, Sep 2026). Single source of truth for every session-related
 * number and for the one timezone the platform schedules in — Parts
 * 1B onward (join window, attendance, cancellation, disputes,
 * completion) read from here instead of hardcoding their own copies.
 *
 * Pure constants, no `server-only` — the booking screen reads
 * `SESSION_POLICY.minSessionsPerCycle` on the client too.
 */

/**
 * The one fixed timezone every class time is interpreted in
 * ("16:00" on a `ClassSession` means 16:00 IST), independent of the
 * server's own timezone or the viewer's browser. IST is assumed —
 * confirm; if it's ever different, change these two constants only.
 *
 * India has no daylight saving, so a fixed UTC offset is exact and
 * needs no timezone database. If a zone with DST is ever chosen,
 * `platformTime.ts` must switch to `Intl`-based conversion.
 */
export const PLATFORM_TIMEZONE = "Asia/Kolkata";
export const PLATFORM_UTC_OFFSET_MINUTES = 5 * 60 + 30;

export const SESSION_POLICY = {
  /** Join opens this many minutes before a session starts. */
  joinOpensMinutesBefore: 10,
  /** Grace period (minutes) after the start time. */
  graceMinutes: 10,
  /** Minimum overlap (% of the session length) for it to count as held. */
  minOverlapPercent: 50,
  /** Minimum notice (hours) to cancel/reschedule a session. */
  cancelNoticeHours: 4,
  /** How long (hours) after a session a dispute can be raised. */
  disputeWindowHours: 48,
  /** Days a cycle has to be completed. */
  completionWindowDays: 45,
  /** Minimum sessions a cycle must contain to be bookable. */
  minSessionsPerCycle: 4,
  /**
   * How long (minutes) after a session's scheduled end the sweep
   * (`/api/cron/resolve-sessions`) picks up any session nothing else
   * has resolved yet. Ending a session and reading one after its end
   * time both resolve it immediately; the sweep is only the backstop.
   */
  sweepDelayMinutes: 15,
} as const;

/**
 * Fallback session length (minutes) when a Course has no usable
 * `duration` (the field is optional free text — see
 * `parseSessionLengthMinutes`). Flagged assumption: confirm 60.
 */
export const DEFAULT_SESSION_LENGTH_MINUTES = 60;
