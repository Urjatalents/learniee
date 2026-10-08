"use client";
import StatCard from "@/features/accounts/components/StatCard";
import {
    useAccountsAnalytics
} from "@/features/accounts/hooks/useAccountsAnalytics";
import {
    IndianRupee,
    PiggyBank,
    TrendingDown,
    TrendingUp,
    Wallet2
} from "lucide-react";
import { CustomBreakdownDonut } from './breakdown';
import { currency } from './constants';
import { ExpenseCompositionDonut, PayoutStatusDonut, RevenueCompositionDonut, RevenueVsExpenseDonut } from './donuts';
import { PeriodPicker, usePeriodRange } from './period';

/**
 * Accounts Analytics — pie/donut-led layout.
 *
 * Third pass: the previous version mixed bar charts and one donut. Every
 * chart here is now a donut (a pie with a hole for a center total), because
 * every question this page answers is a "what share of the whole" question:
 * revenue vs. expense, what revenue is made of, what expense is made of, and
 * what share of payouts sits in each status. The KPI tiles up top stay as
 * exact numbers for the cases where a shape isn't what you want; the four
 * donuts below are the redesign the diagrams live in. Colors keep the
 * project's fixed-meaning rule: green = revenue, rose = expense, and the
 * payout-status palette is reused identically wherever a status appears.
 *
 * The Build Your Own Breakdown card keeps its own `usePeriodRange()` and
 * fetches independently — it's meant to be checked against a different
 * window than the rest of the page without disturbing it, so it never
 * shares the period state or data below.
 */
export default function AccountsAnalyticsPanel() {
  const { preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo, range, rangeLabel } =
    usePeriodRange();

  const { analytics, loading, error } = useAccountsAnalytics(range);

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-xl border shadow-sm p-4 flex flex-col gap-4">
        <PeriodPicker
          preset={preset}
          onPresetChange={setPreset}
          customFrom={customFrom}
          onCustomFromChange={setCustomFrom}
          customTo={customTo}
          onCustomToChange={setCustomTo}
        />
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
          <KpiRow analytics={analytics} rangeLabel={rangeLabel} />
          <CustomBreakdownDonut />
          <div className="grid xl:grid-cols-2 gap-6">
            <RevenueVsExpenseDonut analytics={analytics} rangeLabel={rangeLabel} />
            <PayoutStatusDonut analytics={analytics} rangeLabel={rangeLabel} />
            <RevenueCompositionDonut analytics={analytics} rangeLabel={rangeLabel} />
            <ExpenseCompositionDonut analytics={analytics} rangeLabel={rangeLabel} />
          </div>
        </>
      )}
    </div>
  );
}
/**
 * Top-of-page KPI tiles — the four headline numbers at a glance
 * (Total Revenue, Total Expense, Net Profit/Loss, Platform Profit)
 * instead of having to find them inside a chart below. Colors follow
 * the same rule as the rest of the page: revenue-side numbers are
 * green, expense-side are rose. Platform Profit is the one deliberate
 * exception — it's a *different* profit figure (the resolved 70/30
 * ledger formula, not Revenue − Expense), so it's kept in brand violet
 * specifically so it never gets visually mistaken for Net Profit.
 */
function KpiRow({
  analytics,
  rangeLabel,
}: {
  analytics: ReturnType<typeof useAccountsAnalytics>["analytics"];
  rangeLabel: string;
}) {
  if (!analytics) return null;
  const isProfit = analytics.net.profit > 0 || analytics.net.loss === 0;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-sm font-semibold text-gray-500">Overview</h2>
        <span className="text-xs font-medium text-gray-400">{rangeLabel}</span>
      </div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Revenue"
          value={currency.format(analytics.revenue.totalRevenue)}
          icon={IndianRupee}
          tone="positive"
          sublabel="Tuition + Demo"
        />
        <StatCard
          label="Total Expense"
          value={currency.format(analytics.expense.totalExpense)}
          icon={Wallet2}
          tone="negative"
          sublabel="Payouts + Rewards + Wallet"
        />
        <StatCard
          label={isProfit ? "Net Profit" : "Net Loss"}
          value={isProfit ? currency.format(analytics.net.profit) : `(${currency.format(analytics.net.loss)})`}
          icon={isProfit ? TrendingUp : TrendingDown}
          tone={isProfit ? "positive" : "negative"}
          sublabel="Revenue − Expense"
        />
        <StatCard
          label="Platform Profit"
          value={currency.format(analytics.profit.platformProfit)}
          icon={PiggyBank}
          tone="brand"
          sublabel="Resolved 70/30 ledger formula"
        />
      </div>
    </div>
  );
}
