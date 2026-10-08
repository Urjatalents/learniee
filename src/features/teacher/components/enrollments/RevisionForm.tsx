"use client";

import { useState } from "react";

import { toggleWeekday } from "@/features/shared/utils/weekdays";
import WeekdayTimePicker from "./WeekdayTimePicker";

export interface RevisionInput {
  note: string;
  cycleStartDate?: string;
  sessionsPerMonth?: number;
  scheduleDays?: number[];
  scheduleTime?: string;
}

interface Props {
  isLegacy: boolean;
  minStartDate: string;
  onSubmit: (input: RevisionInput) => void;
  onCancel: () => void;
}

/** Teacher's "Propose a change" form: note + new start date and/or schedule. */
export default function RevisionForm({ isLegacy, minStartDate, onSubmit, onCancel }: Props) {
  const [note, setNote] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newSessions, setNewSessions] = useState("");
  const [newScheduleDays, setNewScheduleDays] = useState<number[]>([]);
  const [newScheduleTime, setNewScheduleTime] = useState("");

  function submitRevision() {
    if (!note.trim()) return;

    onSubmit({
      note,
      cycleStartDate: newDate || undefined,
      sessionsPerMonth: isLegacy && newSessions ? Number(newSessions) : undefined,
      scheduleDays: newScheduleDays.length ? newScheduleDays : undefined,
      scheduleTime: newScheduleTime || undefined,
    });
  }

  return (
    <div className="mt-4 bg-purple-50 border border-purple-100 rounded-xl p-3 space-y-2">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Explain the change to the parent (required) — full discussion happens in chat"
        className="w-full text-xs border border-purple-200 rounded-lg px-2 py-1.5 bg-white"
        rows={2}
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="date"
          min={isLegacy ? undefined : minStartDate}
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          className="text-xs border border-purple-200 rounded-lg px-2 py-1.5 bg-white"
        />
        {isLegacy && (
          <input
            type="number"
            min={4}
            max={31}
            value={newSessions}
            onChange={(e) => setNewSessions(e.target.value)}
            placeholder="New sessions/month"
            className="text-xs border border-purple-200 rounded-lg px-2 py-1.5 bg-white"
          />
        )}
      </div>
      {!isLegacy && (
        <p className="text-[11px] text-purple-700">
          Propose a different start date and/or weekly schedule — the
          session count and price are recalculated from it (minimum 4
          sessions in the cycle). Times are in IST.
        </p>
      )}

      <WeekdayTimePicker
        days={newScheduleDays}
        onToggleDay={(day) => setNewScheduleDays((c) => toggleWeekday(c, day))}
        time={newScheduleTime}
        onTimeChange={setNewScheduleTime}
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={submitRevision}
          disabled={!note.trim()}
          className="text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-40 px-3 py-1.5 rounded-full"
        >
          Send to parent
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
