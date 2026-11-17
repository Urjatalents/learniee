"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { kcStyle } from "@/features/parent/components/home/HomeBits";
import {
  dayDiff,
  dayKey,
  shortSubject,
} from "@/features/parent/components/home/homeLogic";
import {
  chipLabel,
  monthStart,
  shortTime,
  type CalEvent,
} from "@/features/parent/components/calendar/calendarLogic";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const ICON_BTN =
  "grid size-11 place-items-center rounded-[10px] text-pd-ink2 transition-colors hover:bg-pd-b50 hover:text-pd-brand";

interface Props {
  /** "YYYY-MM". */
  month: string;
  selected: string;
  byDay: Map<string, CalEvent[]>;
  /** Learner colour for an event (null = brand purple). */
  colorOf: (e: CalEvent) => string | null;
  /** Learners to list in the legend; empty hides the legend. */
  legend: { id: string; first: string; color: string | null }[];
  busy?: boolean;
  onSelect: (key: string) => void;
  onPrev: () => void;
  onNext: () => void;
}

/** Month card of the Parent calendar: day cells with up to two class chips each. */
export default function PdMonthGrid({
  month,
  selected,
  byDay,
  colorOf,
  legend,
  busy = false,
  onSelect,
  onPrev,
  onNext,
}: Props) {
  const first = monthStart(month);
  const y = first.getFullYear();
  const m = first.getMonth();
  const days = new Date(y, m + 1, 0).getDate();
  const now = new Date();

  return (
    <div
      aria-busy={busy}
      className={`rounded-2xl border border-pd-line bg-white p-5 transition-opacity ${
        busy ? "opacity-60" : ""
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <button type="button" className={ICON_BTN} onClick={onPrev} aria-label="Previous month">
          <ChevronLeft size={20} />
        </button>
        <h2 className="font-heading text-lg font-semibold text-pd-ink">
          {first.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
        </h2>
        <button type="button" className={ICON_BTN} onClick={onNext} aria-label="Next month">
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-[3px] sm:gap-1.5">
        {DAY_NAMES.map((d) => (
          <div key={d} className="py-1 text-center text-[11px] font-semibold text-pd-ink3">
            {d.slice(0, 1)}
          </div>
        ))}

        {Array.from({ length: first.getDay() }, (_, i) => (
          <div key={`pad-${i}`} />
        ))}

        {Array.from({ length: days }, (_, i) => {
          const d = i + 1;
          const dt = new Date(y, m, d);
          const k = dayKey(dt);
          const list = byDay.get(k) ?? [];
          const isToday = dayDiff(dt, now) === 0;
          const on = selected === k;

          return (
            <button
              key={k}
              type="button"
              aria-pressed={on}
              onClick={() => onSelect(k)}
              aria-label={`${dt.toLocaleDateString("en-IN", { day: "numeric", month: "long" })}${
                list.length ? `, ${list.length} session${list.length > 1 ? "s" : ""}` : ""
              }`}
              className={`flex min-h-16 min-w-0 flex-col items-stretch justify-start gap-[5px] rounded-lg border border-pd-line px-1 py-[5px] text-left transition-colors sm:min-h-24 sm:rounded-xl ${
                on
                  ? "bg-pd-b50 shadow-[inset_0_0_0_2px_var(--color-pd-brand)]"
                  : "bg-white hover:bg-pd-b50"
              }`}
            >
              <span
                className={`ml-0.5 grid size-5 place-items-center rounded-full text-xs font-semibold sm:size-6 sm:text-[13px] ${
                  isToday ? "bg-pd-brand text-white" : "text-pd-ink2"
                }`}
              >
                {d}
              </span>

              <span className="flex min-w-0 flex-col gap-[3px]">
                {list.slice(0, 2).map((e) => (
                  <span
                    key={e.id}
                    style={kcStyle(colorOf(e))}
                    className="flex min-w-0 items-center gap-1 rounded-md border border-[color-mix(in_srgb,var(--kc)_28%,#fff)] bg-[color-mix(in_srgb,var(--kc)_12%,#fff)] py-0.5 pl-[5px] pr-1 text-[11px] font-medium leading-[1.35] text-pd-ink2 max-sm:justify-center max-sm:px-[3px] max-sm:py-px"
                  >
                    <i className="whitespace-nowrap font-bold not-italic text-(--kc) max-sm:text-[9.5px] max-sm:tracking-[-0.02em]">
                      {e.hasTime ? shortTime(e.start) : "•"}
                    </i>
                    <span className="truncate max-sm:hidden">{chipLabel(e, shortSubject)}</span>
                  </span>
                ))}
                {list.length > 2 && (
                  <span className="pl-1 text-[11px] font-semibold text-pd-ink3 max-sm:pl-0 max-sm:text-center">
                    <span className="max-sm:hidden">+{list.length - 2} more</span>
                    <span className="hidden text-[10px] max-sm:inline">+</span>
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {legend.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-3.5 text-xs font-medium text-pd-ink3">
          <span>* demo</span>
          {legend.map((k) => (
            <span key={k.id} className="inline-flex items-center gap-1.5">
              <i
                className="size-2 rounded-full"
                style={{ background: k.color ?? "var(--color-pd-brand)" }}
              />
              {k.first}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
