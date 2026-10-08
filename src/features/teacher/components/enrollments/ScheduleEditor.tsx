"use client";

import { useState } from "react";

import { toggleWeekday } from "@/features/shared/utils/weekdays";
import WeekdayTimePicker from "./WeekdayTimePicker";

interface Props {
  hasSchedule: boolean;
  initialDays: number[];
  initialTime: string;
  onSave: (input: { scheduleDays: number[]; scheduleTime: string }) => void;
  onCancel: () => void;
}

/** Legacy enrollments only: set or change the weekly schedule. */
export default function ScheduleEditor({ hasSchedule, initialDays, initialTime, onSave, onCancel }: Props) {
  const [scheduleDaysDraft, setScheduleDaysDraft] = useState<number[]>(initialDays);
  const [scheduleTimeDraft, setScheduleTimeDraft] = useState(initialTime);

  function submitSchedule() {
    if (scheduleDaysDraft.length === 0 || !scheduleTimeDraft) return;
    onSave({ scheduleDays: scheduleDaysDraft, scheduleTime: scheduleTimeDraft });
  }

  return (
    <div className="mt-3 bg-purple-50 border border-purple-100 rounded-xl p-3 space-y-2">
      {!hasSchedule && (
        <p className="text-[11px] text-purple-700">
          This enrollment has no schedule yet, so it won&apos;t show on the
          calendar until one is set.
        </p>
      )}
      <WeekdayTimePicker
        days={scheduleDaysDraft}
        onToggleDay={(day) => setScheduleDaysDraft((c) => toggleWeekday(c, day))}
        time={scheduleTimeDraft}
        onTimeChange={setScheduleTimeDraft}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={submitSchedule}
          disabled={scheduleDaysDraft.length === 0 || !scheduleTimeDraft}
          className="text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-40 px-3 py-1.5 rounded-full"
        >
          Save schedule
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-bold text-gray-600 bg-white border border-gray-200 px-3 py-1.5 rounded-full"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
