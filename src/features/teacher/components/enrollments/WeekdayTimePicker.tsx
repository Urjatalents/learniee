"use client";

import { WEEKDAY_LABELS } from "@/features/shared/utils/weekdays";

interface Props {
  days: number[];
  onToggleDay: (day: number) => void;
  time: string;
  onTimeChange: (time: string) => void;
}

/** Weekday chips + a time input; shared by the schedule editor and the revision form. */
export default function WeekdayTimePicker({ days, onToggleDay, time, onTimeChange }: Props) {
  return (
    <div className="flex gap-1 flex-wrap">
      {WEEKDAY_LABELS.map((label, day) => {
        const active = days.includes(day);
        return (
          <button
            key={label}
            type="button"
            onClick={() => onToggleDay(day)}
            className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
              active
                ? "bg-purple-600 text-white border-purple-600"
                : "bg-white text-gray-500 border-purple-200"
            }`}
          >
            {label}
          </button>
        );
      })}
      <input
        type="time"
        value={time}
        onChange={(e) => onTimeChange(e.target.value)}
        className="text-xs border border-purple-200 rounded-lg px-2 py-1 bg-white"
      />
    </div>
  );
}
