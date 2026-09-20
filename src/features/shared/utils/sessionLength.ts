import { DEFAULT_SESSION_LENGTH_MINUTES } from "@/lib/platformConfig";

const MIN_MINUTES = 10;
const MAX_MINUTES = 300;

/**
 * `Course.duration` is free text picked from `DURATION_OPTIONS`
 * ("30 Minutes", "45 Minutes", "1 Hour", "1.5 Hours", "2 Hours").
 * Converts it to whole minutes, or null if it can't be read — the
 * caller decides the fallback (`sessionLengthForCourse`).
 */
export function parseSessionLengthMinutes(
  duration: string | null | undefined,
): number | null {
  if (!duration) return null;

  const match = /(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)\b/i.exec(
    duration.trim(),
  );

  if (!match) return null;

  const amount = Number(match[1]);
  const isHours = match[2].toLowerCase().startsWith("h");
  const minutes = Math.round(isHours ? amount * 60 : amount);

  return minutes >= MIN_MINUTES && minutes <= MAX_MINUTES ? minutes : null;
}

/** Session length for a course, falling back to the platform default. */
export function sessionLengthForCourse(
  duration: string | null | undefined,
): number {
  return parseSessionLengthMinutes(duration) ?? DEFAULT_SESSION_LENGTH_MINUTES;
}
