/**
 * Shared helpers for Enrollment's recurring weekly schedule
 * (`scheduleDays`/`scheduleTime`, see 03-DATA-MODEL.md). Used by
 * the Parent booking panel, Parent/Teacher enrollment cards, and
 * both calendar views so the day/time convention (0=Sunday, JS
 * `Date.getDay()`) and display formatting stay consistent in one
 * place.
 */

export const WEEKDAY_LABELS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

export const WEEKDAY_LABELS_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** "16:00" -> "4:00 PM". Falls back to the raw string if malformed. */
export function formatScheduleTime(time: string | null | undefined) {
  if (!time) return null;

  const [hStr, mStr] = time.split(":");
  const h = Number(hStr);
  const m = Number(mStr);

  if (Number.isNaN(h) || Number.isNaN(m)) return time;

  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;

  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

/** [1, 3, 5] + "16:00" -> "Mon, Wed, Fri · 4:00 PM" */
export function formatSchedule(
  days: number[] | null | undefined,
  time: string | null | undefined,
) {
  if (!days?.length) return "Schedule not set yet";

  const dayLabels = [...days]
    .sort((a, b) => a - b)
    .map((d) => WEEKDAY_LABELS[d] ?? "?")
    .join(", ");

  const timeLabel = formatScheduleTime(time);

  return timeLabel ? `${dayLabels} · ${timeLabel}` : dayLabels;
}

/** Cycling color palette for calendar events, keyed by an index (e.g. per student). */
export const CALENDAR_COLORS = [
  { bg: "bg-violet-100", text: "text-violet-700", dot: "bg-violet-500" },
  { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
  { bg: "bg-rose-100", text: "text-rose-700", dot: "bg-rose-500" },
  { bg: "bg-cyan-100", text: "text-cyan-700", dot: "bg-cyan-500" },
  { bg: "bg-fuchsia-100", text: "text-fuchsia-700", dot: "bg-fuchsia-500" },
  { bg: "bg-lime-100", text: "text-lime-700", dot: "bg-lime-500" },
] as const;

export function colorForKey(key: string, keys: string[]) {
  const index = keys.indexOf(key);
  return CALENDAR_COLORS[index % CALENDAR_COLORS.length];
}

/** Adds the weekday if absent, removes it if present; result is sorted ascending (0 = Sunday). */
export function toggleWeekday(days: number[], day: number): number[] {
  return days.includes(day)
    ? days.filter((d) => d !== day)
    : [...days, day].sort((a, b) => a - b);
}
