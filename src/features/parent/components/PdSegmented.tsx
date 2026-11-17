"use client";

export interface PdSegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Count bubble shown after the label (always shown, even for 0). */
  count?: number;
  /** Amber bubble instead of the violet one (things that need attention). */
  warn?: boolean;
}

interface Props<T extends string> {
  options: PdSegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name of the group. */
  label: string;
}

/**
 * Parent-design segmented control ("Upcoming 2 | Completed 2"). Reusable on any
 * Parent tab that switches between a few lists.
 */
export default function PdSegmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: Props<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex gap-1 rounded-xl bg-[#ebeaf4] p-1"
    >
      {options.map((o) => {
        const on = o.value === value;

        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={`flex h-9 items-center gap-2 rounded-[9px] px-3.5 text-[13px] transition-colors ${
              on
                ? "bg-white font-semibold text-pd-ink shadow-[0_1px_3px_rgba(23,23,43,0.12)]"
                : "font-medium text-pd-ink2"
            }`}
          >
            {o.label}
            {o.count !== undefined && (
              <span
                className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold ${
                  o.warn ? "bg-pd-amber-bg text-pd-amber" : "bg-pd-b100 text-pd-brand-d"
                }`}
              >
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
