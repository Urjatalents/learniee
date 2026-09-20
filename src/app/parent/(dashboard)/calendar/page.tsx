"use client";

import { useMemo, useState } from "react";

import { useParentCalendar } from "@/features/parent/hooks/useCalendar";
import { useStudents } from "@/features/parent/hooks/useStudents";
import MonthCalendar from "@/features/shared/components/calendar/MonthCalendar";
import { colorForKey } from "@/features/shared/utils/weekdays";

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * All children's scheduled classes in one calendar, with an
 * optional filter down to a single child. Each child's classes are
 * color-coded so multiple kids' schedules stay distinguishable when
 * viewing "All children". The same data also powers the mini
 * calendar embedded on each child's own profile page (scoped via
 * `studentId`, see students/[studentId]/page.tsx).
 */
export default function ParentCalendarPage() {
  const [month, setMonth] = useState(currentMonthKey());
  const [studentId, setStudentId] = useState<string>("");

  const { students } = useStudents();
  const { occurrences, loading } = useParentCalendar(
    month,
    studentId || undefined,
  );

  const studentIds = useMemo(() => students.map((s) => s.id), [students]);

  return (
    <div className="max-w-4xl mx-auto p-5 sm:p-8">
      <h1 className="font-heading text-xl font-bold text-gray-800 mb-1">
        Calendar
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Every scheduled class across your children — filter to one child if
        you'd rather see just their schedule.
      </p>

      <div className="flex items-center gap-3 mb-4">
        <select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className="text-sm border border-violet-100 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand/30"
        >
          <option value="">All children</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.visibleName || s.firstName}
            </option>
          ))}
        </select>
      </div>

      {!studentId && students.length > 1 && (
        <div className="flex flex-wrap gap-3 mb-4">
          {students.map((s) => {
            const color = colorForKey(s.id, studentIds);
            return (
              <div key={s.id} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className={`w-2.5 h-2.5 rounded-full ${color.dot}`} />
                {s.visibleName || s.firstName}
              </div>
            );
          })}
        </div>
      )}

      <MonthCalendar
        month={month}
        occurrences={occurrences}
        loading={loading}
        onPrevMonth={() => setMonth((m) => shiftMonth(m, -1))}
        onNextMonth={() => setMonth((m) => shiftMonth(m, 1))}
        colorBy="student"
        // Cycle-model classes have their own page (Start/Join, and the
        // after-class summary / confirmation); legacy ones don't.
        sessionHref={(occ) => (occ.startsAt ? `/parent/classes/${occ.id}/join` : null)}
        emptyMessage={
          studentId
            ? "No classes scheduled for this child this month."
            : "No classes scheduled for any of your children this month."
        }
      />
    </div>
  );
}
