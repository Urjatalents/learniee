"use client";
import {
    daysInMonth,
    toDateKey,
    todayInPlatformTz,
    type CalendarDate,
} from "@/lib/platformTime";
import { useMemo, useState } from "react";
import { PRESETS, PresetId } from './constants';

function presetRange(preset: PresetId): { from?: string; to?: string } {
  const today = todayInPlatformTz();

  if (preset === "all") return {};

  if (preset === "this_month") {
    const from: CalendarDate = { year: today.year, month: today.month, day: 1 };
    return { from: toDateKey(from), to: toDateKey(today) };
  }

  if (preset === "last_month") {
    const year = today.month === 1 ? today.year - 1 : today.year;
    const month = today.month === 1 ? 12 : today.month - 1;
    const from: CalendarDate = { year, month, day: 1 };
    const to: CalendarDate = { year, month, day: daysInMonth(year, month) };
    return { from: toDateKey(from), to: toDateKey(to) };
  }

  if (preset === "this_year") {
    const from: CalendarDate = { year: today.year, month: 1, day: 1 };
    return { from: toDateKey(from), to: toDateKey(today) };
  }

  // "custom" is resolved by the caller from the date inputs, not here.
  return {};
}
/**
 * One independent "Period" selection (preset + optional custom range +
 * derived label). Pulled out so the top-of-page filter and the Build Your
 * Own Breakdown card can each hold their own period without sharing state —
 * switching one to "This Month" must not move the other.
 */
export function usePeriodRange() {
  const [preset, setPreset] = useState<PresetId>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const range = useMemo(() => {
    if (preset === "custom") {
      return { from: customFrom || undefined, to: customTo || undefined };
    }
    return presetRange(preset);
  }, [preset, customFrom, customTo]);

  const rangeLabel = useMemo(() => {
    if (preset !== "custom") return PRESETS.find((p) => p.id === preset)?.label ?? "";
    if (range.from && range.to) return `${range.from} to ${range.to}`;
    if (range.from) return `From ${range.from}`;
    if (range.to) return `Up to ${range.to}`;
    return "All Time";
  }, [preset, range]);

  return { preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo, range, rangeLabel };
}
/** The row of period preset buttons (+ custom date inputs) — rendered by whoever owns a `usePeriodRange()`. */
export function PeriodPicker({
  preset,
  onPresetChange,
  customFrom,
  onCustomFromChange,
  customTo,
  onCustomToChange,
}: {
  preset: PresetId;
  onPresetChange: (p: PresetId) => void;
  customFrom: string;
  onCustomFromChange: (v: string) => void;
  customTo: string;
  onCustomToChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 mr-1">Period</span>
      {PRESETS.map((p) => {
        const active = preset === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onPresetChange(p.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              active
                ? "bg-brand border-brand text-white"
                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
            aria-pressed={active}
          >
            {p.label}
          </button>
        );
      })}

      {preset === "custom" && (
        <span className="flex items-center gap-2 ml-1">
          <input
            aria-label="From date"
            type="date"
            value={customFrom}
            max={customTo || undefined}
            onChange={(e) => onCustomFromChange(e.target.value)}
            className="border rounded-lg px-2.5 py-1.5 text-sm text-gray-700"
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            aria-label="To date"
            type="date"
            value={customTo}
            min={customFrom || undefined}
            onChange={(e) => onCustomToChange(e.target.value)}
            className="border rounded-lg px-2.5 py-1.5 text-sm text-gray-700"
          />
        </span>
      )}
    </div>
  );
}
