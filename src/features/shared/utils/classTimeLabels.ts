import { PLATFORM_TIMEZONE } from "@/lib/platformConfig";
import { daysBetween, todayInPlatformTz } from "@/lib/platformTime";

/**
 * Small display helpers for class times, shared by the Parent's
 * "My Classes" pages and the Start / Join page. Everything is read in
 * the platform timezone (`platformConfig.ts`), never the browser's, so
 * a class that is "Today" for the platform is "Today" on every device.
 * Pure functions — `now` is always a parameter.
 */

/** Whole calendar days from `now` to `instant` (platform timezone): 0 = today, 1 = tomorrow, -1 = yesterday. */
export function platformDayOffset(instant: Date, now: Date = new Date()): number {
  return daysBetween(todayInPlatformTz(now), todayInPlatformTz(instant));
}

/** "Today", "Tomorrow", otherwise "Tue, 5 Mar". */
export function formatClassDay(instant: Date, now: Date = new Date()): string {
  const offset = platformDayOffset(instant, now);

  if (offset === 0) return "Today";
  if (offset === 1) return "Tomorrow";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: PLATFORM_TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(instant);
}

/** "Tuesday, 5 March" — the full date for a page header. */
export function formatLongDate(instant: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: PLATFORM_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(instant);
}

/** Whole minutes between two ISO instants (never negative). */
export function minutesBetween(startIso: string, endIso: string): number {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();

  return Math.max(0, Math.round(ms / 60_000));
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

/** The pieces of a small calendar "tile": { weekday: "Tue", day: "5", month: "Mar" }. */
export function formatDateTile(instant: Date): { weekday: string; day: string; month: string } {
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-IN", { timeZone: PLATFORM_TIMEZONE, ...options }).format(instant);

  return {
    weekday: part({ weekday: "short" }),
    day: part({ day: "numeric" }),
    month: part({ month: "short" }),
  };
}
