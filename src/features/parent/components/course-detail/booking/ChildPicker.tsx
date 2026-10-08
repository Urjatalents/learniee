"use client";

import type { useStudents } from "@/features/parent/hooks/useStudents";

type Students = ReturnType<typeof useStudents>["students"];

interface Props {
  students: Students;
  loading: boolean;
  value: string;
  onChange: (id: string) => void;
}

export default function ChildPicker({ students, loading, value, onChange }: Props) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
        Which child is this for?
      </label>

      {loading ? (
        <div className="h-10 rounded-xl bg-violet-50 animate-pulse" />
      ) : students.length === 0 ? (
        <p className="text-xs text-gray-400">
          Add a child profile from the dashboard before booking a demo.
        </p>
      ) : (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-sm border border-violet-100 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand/30"
        >
          <option value="">Select a child</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.visibleName || s.firstName}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
