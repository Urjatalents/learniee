"use client";

import { useMemo, useState } from "react";

import { useTeacherCalendar } from "@/features/teacher/hooks/useCalendar";
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
 * Every scheduled class across every enrolled student, color-coded
 * per child so a busy week is still readable at a glance.
 */
export default function TeacherCalendarPage() {
  const [month, setMonth] = useState(currentMonthKey());
  const { occurrences, loading } = useTeacherCalendar(month);

  const students = useMemo(() => {
    const seen = new Map<string, string>();
    for (const occ of occurrences) {
      if (!seen.has(occ.studentId)) seen.set(occ.studentId, occ.studentName);
    }
    return Array.from(seen, ([id, name]) => ({ id, name }));
  }, [occurrences]);

  const studentIds = useMemo(() => students.map((s) => s.id), [students]);

  return (
    <div className="max-w-4xl mx-auto p-5 sm:p-8">
      <h1 className="font-heading text-xl font-bold text-gray-800 mb-1">
        Calendar
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Every scheduled class this month, across all your students.
      </p>

      {students.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-4">
          {students.map((s) => {
            const color = colorForKey(s.id, studentIds);
            return (
              <div key={s.id} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className={`w-2.5 h-2.5 rounded-full ${color.dot}`} />
                {s.name}
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
        sessionHref={(occ) => (occ.startsAt ? `/teacher/classes/${occ.id}/start` : null)}
        emptyMessage="No classes scheduled this month."
      />
    </div>
  );
}
