"use client";

import { useAccountsAnalytics } from "@/features/accounts/hooks/useAccountsAnalytics";
import PieChart from "@/features/accounts/components/PieChart";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

// Brand violet/yellow first, then a small extended palette for the
// remaining slices — see globals.css for --brand-violet/--brand-yellow.
const EXPENSE_COLORS = ["#7e2bf1", "#f4c01e", "#0ea5a4"];
const BUDGET_COLORS = ["#7e2bf1", "#f4c01e"];

/**
 * Two pie charts for Accounts (`/accounts`) and Admin (`/admin/accounts`,
 * same `AccountsDashboardShell`):
 *  - Expense Distribution — where money leaving the platform actually
 *    goes (Teacher Payouts, Referral Rewards, manual Wallet credits).
 *  - Overall Accounts (Profit & Loss) — total revenue split into
 *    Expense vs. Profit, across Tuition + Demo revenue.
 *
 * Both are computed server-side in `accountsAnalytics.service.ts` and
 * fetched via `useAccountsAnalytics()` — see that file's doc-comment
 * for exactly what counts as "realized" and why demo revenue is
 * booked as pure profit.
 */
export default function AccountsAnalyticsPanel() {
  const { analytics, loading, error } = useAccountsAnalytics();

  if (loading) {
    return (
      <div className="bg-white rounded-xl border shadow-sm p-10 text-center text-sm text-gray-400">
        Loading analytics…
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="bg-white rounded-xl border shadow-sm p-10 text-center text-sm text-red-500">
        {error || "Unable to load analytics."}
      </div>
    );
  }

  const { revenue, expense, profit } = analytics;

  const expenseSlices = [
    { label: "Teacher Payouts", value: expense.teacherPayouts, color: EXPENSE_COLORS[0] },
    { label: "Referral Rewards", value: expense.referralRewards, color: EXPENSE_COLORS[1] },
    { label: "Wallet Credits (Refunds)", value: expense.manualWalletCredits, color: EXPENSE_COLORS[2] },
  ];

  const budgetSlices = [
    { label: "Platform Profit", value: profit.platformProfit, color: BUDGET_COLORS[0] },
    { label: "Expense (Payouts + Rewards)", value: expense.totalExpense, color: BUDGET_COLORS[1] },
  ];

  const totalBudget = profit.platformProfit + expense.totalExpense;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800">Expense Distribution</h2>
        <p className="text-xs text-gray-400 mt-1 mb-6">
          Realized (queued-for-payment or paid) Teacher Payouts, Referral Rewards, and manual
          Wallet credits. Wallet top-ups are excluded — that&apos;s a parent&apos;s own money, not
          a platform expense.
        </p>
        <PieChart
          slices={expenseSlices}
          centerLabel={currency.format(expense.totalExpense)}
          centerSubLabel="Total expense"
        />
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800">Overall Accounts — Profit &amp; Loss</h2>
        <p className="text-xs text-gray-400 mt-1 mb-6">
          Tuition + Demo revenue ({currency.format(revenue.totalRevenue)} total), split into what
          the platform keeps vs. what it pays out.
        </p>
        <PieChart
          slices={budgetSlices}
          centerLabel={currency.format(totalBudget)}
          centerSubLabel="Realized budget"
        />
      </div>
    </div>
  );
}
