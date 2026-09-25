"use client";

import { useMemo, useState } from "react";

import type { LedgerPayoutStatus } from "@prisma/client";

import { useAccountsAnalytics } from "@/features/accounts/hooks/useAccountsAnalytics";
import PieChart, { type PieChartSlice } from "@/features/accounts/components/PieChart";
import {
  daysInMonth,
  toDateKey,
  todayInPlatformTz,
  type CalendarDate,
} from "@/lib/platformTime";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

// Brand violet/yellow first, then a small extended palette for the
// remaining slices — see globals.css for --brand-violet/--brand-yellow.
const PALETTE = ["#7e2bf1", "#f4c01e", "#0ea5a4", "#ef4444", "#3b82f6", "#22c55e", "#f97316"];

type MetricId = "pl" | "expense" | "revenue" | "payout_status";
type PresetId = "all" | "this_month" | "last_month" | "this_year" | "custom";

const METRICS: { id: MetricId; label: string }[] = [
  { id: "pl", label: "Profit & Loss" },
  { id: "expense", label: "Expense Distribution" },
  { id: "revenue", label: "Revenue Breakdown" },
  { id: "payout_status", label: "Teacher Payout Status" },
];

const PRESETS: { id: PresetId; label: string }[] = [
  { id: "all", label: "All Time" },
  { id: "this_month", label: "This Month" },
  { id: "last_month", label: "Last Month" },
  { id: "this_year", label: "This Year" },
  { id: "custom", label: "Custom Range" },
];

const PAYOUT_STATUS_LABELS: Record<LedgerPayoutStatus, string> = {
  PENDING_VERIFICATION: "Pending Verification",
  ON_HOLD: "On Hold",
  QUEUED_FOR_PAYMENT: "Queued for Payment",
  PAID: "Paid",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
  APPROVED: "Approved (legacy)",
};

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
 * Accounts Analytics — Financial Statement layout.
 *
 * Redesigned as a professional ledger statement instead of a single
 * switchable pie chart: a fixed "Statement of Accounts" (Income /
 * Expenses / Net Result, in the same debit-credit-style layout an
 * accountant would expect) and a "Teacher Payout Status" ledger table
 * are always visible for the selected period, with the original
 * selectable donut chart kept below as a supplementary visual. The
 * underlying data and the "Overall Performance" period picker (All
 * Time / This Month / Last Month / This Year / a custom date range)
 * are unchanged.
 *
 * All figures are computed together server-side for the selected
 * range in `accountsAnalytics.service.ts` and fetched via
 * `useAccountsAnalytics()` — see that file's doc-comment for exactly
 * what counts as "realized" and how the Net Profit/Loss view differs
 * from the resolved ledger Profits formula.
 */
export default function AccountsAnalyticsPanel() {
  const [metric, setMetric] = useState<MetricId>("pl");
  const [preset, setPreset] = useState<PresetId>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const range = useMemo(() => {
    if (preset === "custom") {
      return { from: customFrom || undefined, to: customTo || undefined };
    }
    return presetRange(preset);
  }, [preset, customFrom, customTo]);

  const { analytics, loading, error } = useAccountsAnalytics(range);

  const rangeLabel = useMemo(() => {
    if (preset !== "custom") return PRESETS.find((p) => p.id === preset)?.label ?? "";
    if (range.from && range.to) return `${range.from} to ${range.to}`;
    if (range.from) return `From ${range.from}`;
    if (range.to) return `Up to ${range.to}`;
    return "All Time";
  }, [preset, range]);

  const slices: PieChartSlice[] = useMemo(() => {
    if (!analytics) return [];

    if (metric === "pl") {
      return [
        { label: "Net Profit", value: analytics.net.profit, color: PALETTE[0] },
        { label: "Net Loss", value: analytics.net.loss, color: PALETTE[3] },
        { label: "Expense (Payouts + Rewards)", value: analytics.expense.totalExpense, color: PALETTE[1] },
      ];
    }

    if (metric === "expense") {
      return [
        { label: "Teacher Payouts", value: analytics.expense.teacherPayouts, color: PALETTE[0] },
        { label: "Referral Rewards", value: analytics.expense.referralRewards, color: PALETTE[1] },
        { label: "Wallet Credits (Refunds)", value: analytics.expense.manualWalletCredits, color: PALETTE[2] },
      ];
    }

    if (metric === "revenue") {
      return [
        { label: "Tuition Revenue", value: analytics.revenue.tuitionRevenue, color: PALETTE[0] },
        { label: "Demo Revenue", value: analytics.revenue.demoRevenue, color: PALETTE[1] },
      ];
    }

    // payout_status
    return analytics.payoutStatusBreakdown.map((row, i) => ({
      label: `${PAYOUT_STATUS_LABELS[row.status] ?? row.status} (${row.count})`,
      value: row.amount,
      color: PALETTE[i % PALETTE.length],
    }));
  }, [analytics, metric]);

  const centerTotal = useMemo(() => slices.reduce((sum, s) => sum + Math.max(0, s.value), 0), [slices]);

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-xl border shadow-sm p-4 flex flex-wrap items-center gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="analytics-metric" className="text-xs font-medium text-gray-500">
            Metric
          </label>
          <select
            id="analytics-metric"
            value={metric}
            onChange={(e) => setMetric(e.target.value as MetricId)}
            className="border rounded-lg px-3 py-2 text-sm text-gray-700"
          >
            {METRICS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="analytics-period" className="text-xs font-medium text-gray-500">
            Overall Performance — Period
          </label>
          <select
            id="analytics-period"
            value={preset}
            onChange={(e) => setPreset(e.target.value as PresetId)}
            className="border rounded-lg px-3 py-2 text-sm text-gray-700"
          >
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {preset === "custom" && (
          <>
            <div className="flex flex-col gap-1">
              <label htmlFor="analytics-from" className="text-xs font-medium text-gray-500">
                From
              </label>
              <input
                id="analytics-from"
                type="date"
                value={customFrom}
                max={customTo || undefined}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm text-gray-700"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="analytics-to" className="text-xs font-medium text-gray-500">
                To
              </label>
              <input
                id="analytics-to"
                type="date"
                value={customTo}
                min={customFrom || undefined}
                onChange={(e) => setCustomTo(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm text-gray-700"
              />
            </div>
          </>
        )}
      </div>

      {loading && (
        <div className="bg-white rounded-xl border shadow-sm p-10 text-center text-sm text-gray-400">
          Loading analytics…
        </div>
      )}

      {!loading && (error || !analytics) && (
        <div className="bg-white rounded-xl border shadow-sm p-10 text-center text-sm text-red-500">
          {error || "Unable to load analytics."}
        </div>
      )}

      {!loading && analytics && (
        <>
          <StatementOfAccounts analytics={analytics} rangeLabel={rangeLabel} />
          <PayoutStatusLedger analytics={analytics} rangeLabel={rangeLabel} />

          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
              <h2 className="text-lg font-semibold text-gray-800">
                Visual Breakdown — {METRICS.find((m) => m.id === metric)?.label}
              </h2>
              <span className="text-xs font-medium text-gray-400">{rangeLabel}</span>
            </div>
            <p className="text-xs text-gray-400 mb-6">
              {metric === "pl" &&
                "Total revenue (Tuition + Demo) vs. total expense (Teacher Payouts, Referral Rewards, Wallet credits) for the selected period. Net Loss is 0 unless expense exceeds revenue."}
              {metric === "expense" &&
                "Realized (queued-for-payment or paid) Teacher Payouts, Referral Rewards, and manual Wallet credits. Wallet top-ups are excluded — that's a parent's own money, not a platform expense."}
              {metric === "revenue" && "Tuition + Demo revenue for the selected period."}
              {metric === "payout_status" &&
                "Every Tuition Ledger row for the selected period, bucketed by its current payout status."}
            </p>
            <PieChart
              slices={slices}
              centerLabel={currency.format(centerTotal)}
              centerSubLabel="Total"
            />
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Ledger-style row: a label on the left and a right-aligned, tabular
 * figure on the right, optionally indented (line item) or emphasized
 * (subtotal/total). Shared by every section of the statement below.
 */
function LedgerRow({
  label,
  value,
  indent = false,
  emphasis = false,
  tone,
  topBorder = false,
}: {
  label: string;
  value: number;
  indent?: boolean;
  emphasis?: boolean;
  tone?: "positive" | "negative";
  topBorder?: boolean;
}) {
  const valueColor =
    tone === "positive" ? "text-green-700" : tone === "negative" ? "text-red-600" : "text-gray-800";

  return (
    <div
      className={`flex items-baseline justify-between gap-4 py-2 ${
        topBorder ? "border-t border-gray-200 mt-1 pt-3" : ""
      }`}
    >
      <span
        className={`${indent ? "pl-4 text-gray-500" : "text-gray-700"} ${
          emphasis ? "font-semibold text-gray-800" : ""
        } text-sm`}
      >
        {label}
      </span>
      <span
        className={`tabular-nums text-sm ${emphasis ? "font-bold text-base" : "font-medium"} ${valueColor}`}
      >
        {currency.format(value)}
      </span>
    </div>
  );
}

/**
 * "Statement of Accounts" — a fixed Income / Expenses / Net Result
 * ledger for the selected period, laid out the way a printed P&L
 * statement is: line items, an indented breakdown, a ruled subtotal,
 * and a bold net-result line. Read-only summary of the same
 * `AccountsAnalytics` payload the chart below also uses.
 */
function StatementOfAccounts({
  analytics,
  rangeLabel,
}: {
  analytics: ReturnType<typeof useAccountsAnalytics>["analytics"];
  rangeLabel: string;
}) {
  if (!analytics) return null;
  const isProfit = analytics.net.profit > 0 || analytics.net.loss === 0;

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b flex items-baseline justify-between flex-wrap gap-2 bg-gray-50">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Statement of Accounts</h2>
          <p className="text-xs text-gray-400 mt-0.5">Income, expenses and net result for the period.</p>
        </div>
        <span className="text-xs font-medium text-gray-400">{rangeLabel}</span>
      </div>

      <div className="p-6 grid md:grid-cols-2 gap-x-10 gap-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Income</p>
          <LedgerRow label="Tuition Revenue" value={analytics.revenue.tuitionRevenue} indent />
          <LedgerRow label="Demo Revenue" value={analytics.revenue.demoRevenue} indent />
          <LedgerRow label="Total Revenue" value={analytics.revenue.totalRevenue} emphasis topBorder />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Expenses</p>
          <LedgerRow label="Teacher Payouts" value={analytics.expense.teacherPayouts} indent />
          <LedgerRow label="Referral Rewards" value={analytics.expense.referralRewards} indent />
          <LedgerRow label="Wallet Credits (Refunds)" value={analytics.expense.manualWalletCredits} indent />
          <LedgerRow label="Total Expenses" value={analytics.expense.totalExpense} emphasis topBorder />
        </div>
      </div>

      <div className="px-6 pb-6">
        <div className="rounded-lg bg-gray-50 border px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-800">
              {isProfit ? "Net Profit" : "Net Loss"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Total Revenue − Total Expenses, this period.</p>
          </div>
          <span
            className={`text-xl font-bold tabular-nums ${isProfit ? "text-green-700" : "text-red-600"}`}
          >
            {isProfit ? currency.format(analytics.net.profit) : `(${currency.format(analytics.net.loss)})`}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Platform Profit (resolved 70/30 ledger formula, realized cycles only):{" "}
          <span className="font-medium text-gray-600">
            {currency.format(analytics.profit.platformProfit)}
          </span>{" "}
          — differs from Net Profit above, which also nets out Referral Rewards and Wallet credits.
        </p>
      </div>
    </div>
  );
}

/**
 * Teacher Payout Status ledger — every Tuition Ledger row for the
 * period, bucketed by its current payout status, as a ruled table
 * with a grand-total row instead of only being visible by switching
 * the chart's metric dropdown to "Teacher Payout Status".
 */
function PayoutStatusLedger({
  analytics,
  rangeLabel,
}: {
  analytics: ReturnType<typeof useAccountsAnalytics>["analytics"];
  rangeLabel: string;
}) {
  if (!analytics) return null;
  const rows = analytics.payoutStatusBreakdown;
  const totalAmount = rows.reduce((sum, r) => sum + r.amount, 0);
  const totalCount = rows.reduce((sum, r) => sum + r.count, 0);

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b flex items-baseline justify-between flex-wrap gap-2 bg-gray-50">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Teacher Payout Status</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Every Tuition Ledger row for the period, by current payout status.
          </p>
        </div>
        <span className="text-xs font-medium text-gray-400">{rangeLabel}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-6 py-2.5 font-medium">Status</th>
              <th className="px-6 py-2.5 font-medium text-right">Rows</th>
              <th className="px-6 py-2.5 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.status} className="border-t">
                <td className="px-6 py-2.5 text-gray-700">
                  {PAYOUT_STATUS_LABELS[r.status] ?? r.status}
                </td>
                <td className="px-6 py-2.5 text-right text-gray-500 tabular-nums">{r.count}</td>
                <td className="px-6 py-2.5 text-right font-medium text-gray-800 tabular-nums">
                  {currency.format(r.amount)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-400">
                  No ledger entries for this period.
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold text-gray-800">
                <td className="px-6 py-3">Total</td>
                <td className="px-6 py-3 text-right tabular-nums">{totalCount}</td>
                <td className="px-6 py-3 text-right tabular-nums">{currency.format(totalAmount)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
