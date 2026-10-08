"use client";
import PieChart, { type PieChartSlice } from "@/features/accounts/components/PieChart";
import {
    useAccountsAnalytics
} from "@/features/accounts/hooks/useAccountsAnalytics";
import {
    ListChecks
} from "lucide-react";
import { useState } from "react";
import { DEFAULT_SELECTED_METRICS, METRIC_DEFS, METRIC_ORDER, MetricKey, currency } from './constants';
import { PeriodPicker, usePeriodRange } from './period';

/**
 * Build Your Own Breakdown — tick any of the figures on the page (revenue
 * lines, expense lines, Net Profit / Net Loss, Platform Profit) and see
 * them side by side as shares of one combined total, in one donut. Ticked
 * figures with nothing to show for the selected period (e.g. Net Loss
 * during a profitable month) are simply left out of the ring rather than
 * drawn as a zero-width slice.
 *
 * Holds its own `usePeriodRange()` and its own `useAccountsAnalytics` fetch
 * — deliberately not the page's period/data, so this card can be checked
 * against, say, This Month while the rest of the page stays on All Time.
 */
export function CustomBreakdownDonut() {
  const { preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo, range, rangeLabel } =
    usePeriodRange();
  const { analytics, loading, error } = useAccountsAnalytics(range);

  const [selected, setSelected] = useState<Set<MetricKey>>(() => new Set(DEFAULT_SELECTED_METRICS));

  function toggle(key: MetricKey) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const slices: PieChartSlice[] = analytics
    ? METRIC_ORDER.filter((key) => selected.has(key))
        .map((key) => {
          const def = METRIC_DEFS[key];
          return { label: def.label, value: def.getValue(analytics), color: def.color };
        })
        .filter((s) => s.value > 0)
    : [];

  const total = slices.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b flex items-baseline justify-between flex-wrap gap-2 bg-gray-50">
        <div className="flex items-center gap-2">
          <ListChecks size={16} className="text-gray-400" />
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Build Your Own Breakdown</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Tick any figures below to compare them as shares of one total. Has its own period,
              separate from the filter above.
            </p>
          </div>
        </div>
        <span className="text-xs font-medium text-gray-400">{rangeLabel}</span>
      </div>

      <div className="px-6 pt-4">
        <PeriodPicker
          preset={preset}
          onPresetChange={setPreset}
          customFrom={customFrom}
          onCustomFromChange={setCustomFrom}
          customTo={customTo}
          onCustomToChange={setCustomTo}
        />
      </div>

      <div className="p-6 flex flex-col gap-6">
        {loading && <p className="text-sm text-gray-400 text-center py-10">Loading…</p>}

        {!loading && (error || !analytics) && (
          <p className="text-sm text-red-500 text-center py-10">{error || "Unable to load this breakdown."}</p>
        )}

        {!loading && analytics && (
          <>
            <div className="flex flex-wrap gap-2">
              {METRIC_ORDER.map((key) => {
                const def = METRIC_DEFS[key];
                const value = def.getValue(analytics);
                const active = selected.has(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggle(key)}
                    aria-pressed={active}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      active
                        ? "border-transparent text-white"
                        : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                    style={active ? { backgroundColor: def.color } : undefined}
                  >
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: active ? "rgba(255,255,255,0.9)" : def.color }}
                    />
                    {def.label}
                    <span className={active ? "text-white/85" : "text-gray-400"}>
                      {currency.format(value)}
                    </span>
                  </button>
                );
              })}
            </div>

            {slices.length > 0 ? (
              <PieChart
                slices={slices}
                centerLabel={currency.format(total)}
                centerSubLabel={`${slices.length} selected`}
                size={200}
              />
            ) : (
              <p className="text-sm text-gray-400 text-center py-10">
                {selected.size === 0
                  ? "Tick at least one figure above to see the breakdown."
                  : "The figures you've selected are all ₹0 for this period."}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
