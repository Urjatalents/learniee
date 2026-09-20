import { PLATFORM_UTC_OFFSET_MINUTES } from "@/lib/platformConfig";

/**
 * Calendar/timezone helpers pinned to the platform timezone
 * (`platformConfig.ts`), so nothing here depends on the server's or
 * the browser's own timezone. Pure functions, safe on both client
 * and server.
 *
 * A "calendar date" is a plain {year, month, day} (month 1-12) — the
 * day on the wall calendar in the platform timezone, with no time or
 * zone attached. Dates that go into the database are stored as UTC
 * midnight of that calendar date (`calendarDateToDate`), which is
 * also exactly what a Postgres `DATE` column round-trips as.
 */

export interface CalendarDate {
  year: number;
  month: number; // 1-12
  day: number;
}

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Strict "YYYY-MM-DD" -> CalendarDate, or null if malformed / not a real date. */
export function parseDateKey(value: string | null | undefined): CalendarDate | null {
  if (!value) return null;

  const match = DATE_KEY_PATTERN.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return null;
  }

  return { year, month, day };
}

export function toDateKey(d: CalendarDate): string {
  return `${String(d.year).padStart(4, "0")}-${String(d.month).padStart(2, "0")}-${String(
    d.day,
  ).padStart(2, "0")}`;
}

/** Today's calendar date in the platform timezone. */
export function todayInPlatformTz(now: Date = new Date()): CalendarDate {
  const shifted = new Date(now.getTime() + PLATFORM_UTC_OFFSET_MINUTES * 60_000);

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

export function addDays(d: CalendarDate, days: number): CalendarDate {
  const t = new Date(Date.UTC(d.year, d.month - 1, d.day + days));

  return {
    year: t.getUTCFullYear(),
    month: t.getUTCMonth() + 1,
    day: t.getUTCDate(),
  };
}

/**
 * Same day-of-month, next calendar month. If the next month is
 * shorter (31 Jan -> "31 Feb"), clamps to that month's last day.
 */
export function addOneMonthClamped(d: CalendarDate): CalendarDate {
  const year = d.month === 12 ? d.year + 1 : d.year;
  const month = d.month === 12 ? 1 : d.month + 1;

  return { year, month, day: Math.min(d.day, daysInMonth(year, month)) };
}

/** Negative if a < b, 0 if equal, positive if a > b. */
export function compareDates(a: CalendarDate, b: CalendarDate): number {
  return toDateKey(a).localeCompare(toDateKey(b));
}

/** 0=Sunday..6=Saturday — the same convention as `Enrollment.scheduleDays`. */
export function weekdayOf(d: CalendarDate): number {
  return new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay();
}

/** Number of days from a to b (b later than a => positive). */
export function daysBetween(a: CalendarDate, b: CalendarDate): number {
  const ms = Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day);

  return Math.round(ms / 86_400_000);
}

/** CalendarDate -> the Date stored in the DB (UTC midnight of that calendar date). */
export function calendarDateToDate(d: CalendarDate): Date {
  return new Date(Date.UTC(d.year, d.month - 1, d.day));
}

/** Reverse of `calendarDateToDate` (reads UTC parts). */
export function dateToCalendarDate(date: Date): CalendarDate {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

export function isValidTimeOfDay(time: string | null | undefined): time is string {
  return !!time && TIME_PATTERN.test(time);
}

/**
 * The real UTC instant for "this calendar date at HH:mm, platform
 * timezone". Throws on a malformed time — callers validate first.
 */
export function platformWallClockToUtc(d: CalendarDate, time: string): Date {
  const match = TIME_PATTERN.exec(time);

  if (!match) {
    throw new Error(`Invalid time of day: "${time}" (expected HH:mm).`);
  }

  const utcMillis = Date.UTC(
    d.year,
    d.month - 1,
    d.day,
    Number(match[1]),
    Number(match[2]),
  );

  return new Date(utcMillis - PLATFORM_UTC_OFFSET_MINUTES * 60_000);
}
