"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { CalendarOccurrence } from "@/features/shared/types/calendar";
import { colorForKey, formatScheduleTime } from "@/features/shared/utils/weekdays";

interface Props {
  /** "YYYY-MM" of the month currently shown. */
  month: string;
  occurrences: CalendarOccurrence[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
  loading?: boolean;
  /** Groups/colors events by student (Parent "all children" + Teacher views) or by course (single-child view). */
  colorBy?: "student" | "course";
  /** Shown when there's nothing scheduled at all for the month. */
  emptyMessage?: string;
  /**
   * Where a class links to (its session page — Start/Join, and since
   * Part 2A the after-class summary / confirmation). Return null for
   * a class with no page (legacy sessions). Omitted = not clickable.
   */
  sessionHref?: (occurrence: CalendarOccurrence) => string | null;
}

const WEEKDAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildMonthGrid(year: number, monthIndex: number) {
  const firstOfMonth = new Date(year, monthIndex, 1);
  const startOffset = firstOfMonth.getDay(); // 0=Sun
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const cells: (number | null)[] = Array(startOffset).fill(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

export default function MonthCalendar({
  month,
  occurrences,
  onPrevMonth,
  onNextMonth,
  loading,
  colorBy = "student",
  emptyMessage = "No classes scheduled this month.",
  sessionHref,
}: Props) {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;

  const monthLabel = new Date(year, monthIndex, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const cells = buildMonthGrid(year, monthIndex);

  const occurrencesByDate = occurrences.reduce<Record<string, CalendarOccurrence[]>>(
    (acc, occ) => {
      (acc[occ.date] ??= []).push(occ);
      return acc;
    },
    {},
  );

  const colorKeys = Array.from(
    new Set(
      occurrences.map((o) => (colorBy === "course" ? o.courseId : o.studentId)),
    ),
  );

  return (
    <div className="bg-white border border-violet-100 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-violet-50">
        <button
          type="button"
          onClick={onPrevMonth}
          className="p-1.5 rounded-full hover:bg-violet-50 text-gray-500"
          aria-label="Previous month"
        >
          <ChevronLeft size={18} />
        </button>

        <h3 className="font-heading text-sm font-bold text-gray-800">
          {monthLabel}
        </h3>

        <button
          type="button"
          onClick={onNextMonth}
          className="p-1.5 rounded-full hover:bg-violet-50 text-gray-500"
          aria-label="Next month"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-gray-400">Loading schedule…</div>
      ) : (
        <>
          <div className="grid grid-cols-7 border-b border-violet-50 bg-violet-50/40">
            {WEEKDAY_HEADERS.map((label) => (
              <div
                key={label}
                className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-wide py-2"
              >
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              if (day == null) {
                return <div key={idx} className="min-h-[84px] border-b border-r border-violet-50 last:border-r-0" />;
              }

              const dateKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayOccurrences = occurrencesByDate[dateKey] ?? [];

              return (
                <div
                  key={idx}
                  className="min-h-[84px] border-b border-r border-violet-50 last:border-r-0 p-1.5 align-top"
                >
                  <div className="text-[11px] font-semibold text-gray-400 mb-1">{day}</div>

                  <div className="space-y-1">
                    {dayOccurrences.slice(0, 3).map((occ, i) => {
                      const key = colorBy === "course" ? occ.courseId : occ.studentId;
                      const color = colorForKey(key, colorKeys);
                      const href = sessionHref?.(occ) ?? null;
                      const className = `block text-[10px] leading-tight rounded px-1.5 py-1 truncate ${color.bg} ${color.text}${href ? " hover:opacity-80" : ""}`;
                      const title = `${occ.studentName} · ${occ.courseTitle ?? "Course"} with ${occ.teacherName}${occ.time ? " · " + formatScheduleTime(occ.time) : ""}`;
                      const label = (
                        <>
                          <span className="font-bold">
                            {occ.time ? formatScheduleTime(occ.time) : ""}
                          </span>{" "}
                          {colorBy === "course" ? occ.courseTitle ?? "Class" : occ.studentName}
                        </>
                      );

                      return href ? (
                        <Link
                          key={`${occ.enrollmentId}-${i}`}
                          href={href}
                          className={className}
                          title={title}
                        >
                          {label}
                        </Link>
                      ) : (
                        <div key={`${occ.enrollmentId}-${i}`} className={className} title={title}>
                          {label}
                        </div>
                      );
                    })}

                    {dayOccurrences.length > 3 && (
                      <div className="text-[9px] text-gray-400 px-1">
                        +{dayOccurrences.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {occurrences.length === 0 && (
            <p className="text-center text-xs text-gray-400 py-6">{emptyMessage}</p>
          )}
        </>
      )}
    </div>
  );
}
