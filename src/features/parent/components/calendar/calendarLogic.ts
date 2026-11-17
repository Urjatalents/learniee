import type { CalendarOccurrence } from "@/features/shared/types/calendar";
import type { DemoBookingListItem } from "@/features/parent/hooks/useDemoBookings";
import { dayKey, fmtTime } from "@/features/parent/components/home/homeLogic";

/** One thing on the Parent calendar: a class session or a demo. */
export interface CalEvent {
  id: string;
  kind: "class" | "demo";
  start: Date;
  /** False for old (legacy) classes that never had a time set. */
  hasTime: boolean;
  end: Date;
  title: string;
  subject: string;
  teacherName: string;
  studentId: string;
  studentName: string;
  /** "upcoming" = still to happen, "held" = happened, "missed" = a no-show. */
  state: "upcoming" | "held" | "missed";
  /** Where the row links to (null = not clickable). */
  href: string | null;
}

/** Sessions that never happened / were moved — not shown on the calendar. */
const HIDDEN_STATUSES = new Set(["CANCELLED", "CANCELLED_LATE", "EXCUSED"]);
const MISSED_STATUSES = new Set(["STUDENT_NO_SHOW", "TEACHER_NO_SHOW", "MISSED"]);
const DEFAULT_MINUTES = 45;
const LEGACY_MINUTES = 60;

const pad = (n: number) => String(n).padStart(2, "0");

export const monthKeyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  return monthKeyOf(new Date(y, m - 1 + delta, 1));
}

export function monthStart(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1);
}

export function occurrenceToEvent(o: CalendarOccurrence): CalEvent | null {
  if (HIDDEN_STATUSES.has(o.status)) return null;

  const hasTime = Boolean(o.startsAt || o.time);
  const start = o.startsAt ? new Date(o.startsAt) : new Date(`${o.date}T${o.time ?? "00:00"}:00`);
  const end = o.endsAt
    ? new Date(o.endsAt)
    : new Date(start.getTime() + LEGACY_MINUTES * 6e4);

  return {
    id: o.id,
    kind: "class",
    start,
    hasTime,
    end,
    title: o.courseTitle ?? o.subject ?? "Class",
    subject: o.subject ?? "Class",
    teacherName: o.teacherName,
    studentId: o.studentId,
    studentName: o.studentName,
    state:
      o.status === "COMPLETED"
        ? "held"
        : MISSED_STATUSES.has(o.status)
          ? "missed"
          : "upcoming",
    // Cycle-model classes have their own page (Join, summary, confirm);
    // legacy ones don't.
    href: o.startsAt ? `/parent/classes/${o.id}/join` : null,
  };
}

const teacherName = (t: DemoBookingListItem["teacher"]) =>
  t.visibleName?.trim() || `${t.firstName} ${t.lastName}`.trim();

export function demoToEvent(b: DemoBookingListItem): CalEvent | null {
  if (!b.scheduledAt) return null;
  if (b.status !== "CONFIRMED" && b.status !== "COMPLETED") return null;

  const start = new Date(b.scheduledAt);

  return {
    id: `demo-${b.id}`,
    kind: "demo",
    start,
    hasTime: true,
    end: new Date(start.getTime() + DEFAULT_MINUTES * 6e4),
    title: b.course.courseTitle ?? b.subject,
    subject: b.subject,
    teacherName: teacherName(b.teacher),
    studentId: b.student.id,
    studentName: b.student.visibleName?.trim() || b.student.firstName,
    state: b.status === "COMPLETED" ? "held" : "upcoming",
    href: "/parent/my-classes?tab=demos",
  };
}

export function groupByDay(events: CalEvent[]): Map<string, CalEvent[]> {
  const by = new Map<string, CalEvent[]>();

  [...events]
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .forEach((e) => {
      const k = dayKey(e.start);
      by.set(k, [...(by.get(k) ?? []), e]);
    });

  return by;
}

/** "6p", "6:30a" — the compact time on a calendar cell. */
export function shortTime(d: Date): string {
  const [hm, ap] = fmtTime(d).split(" ");
  return hm.replace(":00", "") + (ap === "PM" ? "p" : "a");
}

const SUBJECT_ABBR: Record<string, string> = { English: "Eng" };

/** Label inside a calendar-cell chip. */
export function chipLabel(e: CalEvent, abbreviate: (s: string) => string): string {
  const s = abbreviate(e.subject);
  return (SUBJECT_ABBR[s] ?? s) + (e.kind === "demo" ? "*" : "");
}

/* ---------- Calendar file (.ics) ---------- */

const icsStamp = (d: Date) =>
  d.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");

const icsText = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Builds an .ics file (UTC instants, so it lands at the right time in any timezone). */
export function buildIcs(events: CalEvent[]): string {
  const stamp = icsStamp(new Date());

  const items = events.map((e) =>
    [
      "BEGIN:VEVENT",
      `UID:learniee-${e.id}@learniee`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsStamp(e.start)}`,
      `DTEND:${icsStamp(e.end)}`,
      `SUMMARY:${icsText(`${e.title}${e.kind === "demo" ? " (demo)" : ""} (${e.studentName})`)}`,
      `DESCRIPTION:${icsText(`Teacher: ${e.teacherName}`)}`,
      "END:VEVENT",
    ].join("\r\n"),
  );

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Learniee//EN",
    ...items,
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcs(events: CalEvent[], fileName: string) {
  const blob = new Blob([buildIcs(events)], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 500);
}
