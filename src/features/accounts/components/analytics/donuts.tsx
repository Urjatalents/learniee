"use client";
import PieChart, { type PieChartSlice } from "@/features/accounts/components/PieChart";
import {
    useAccountsAnalytics
} from "@/features/accounts/hooks/useAccountsAnalytics";
import {
    ArrowDownRight,
    ArrowUpRight,
    PieChart as PieChartIcon,
    ReceiptText,
    TrendingDown,
    TrendingUp
} from "lucide-react";
import { type ReactNode } from "react";
import { EXPENSE_MAIN, EXPENSE_TINTS, PAYOUT_STATUS_COLORS, PAYOUT_STATUS_LABELS, REVENUE_MAIN, REVENUE_TINTS, currency } from './constants';

/** Shared card chrome for a single donut, so all four look the same. */
function DonutCard({
  icon: Icon,
  title,
  subtitle,
  rangeLabel,
  children,
  footer,
}: {
  icon: typeof PieChartIcon;
  title: string;
  subtitle: string;
  rangeLabel: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
      <div className="px-6 py-4 border-b flex items-baseline justify-between flex-wrap gap-2 bg-gray-50">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-gray-400" />
          <div>
            <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
          </div>
        </div>
        <span className="text-xs font-medium text-gray-400">{rangeLabel}</span>
      </div>
      <div className="p-6 flex-1">{children}</div>
      {footer}
    </div>
  );
}
/**
 * Revenue vs. Expense — one donut, two slices, always green vs. rose so
 * "which slice is which" never needs a legend. The center shows Net
 * Profit/Loss, the number this whole page is really building up to.
 */
export function RevenueVsExpenseDonut({
  analytics,
  rangeLabel,
}: {
  analytics: ReturnType<typeof useAccountsAnalytics>["analytics"];
  rangeLabel: string;
}) {
  if (!analytics) return null;
  const isProfit = analytics.net.profit > 0 || analytics.net.loss === 0;

  const slices: PieChartSlice[] = [
    { label: "Total Revenue", value: analytics.revenue.totalRevenue, color: REVENUE_MAIN },
    { label: "Total Expense", value: analytics.expense.totalExpense, color: EXPENSE_MAIN },
  ];

  return (
    <DonutCard
      icon={PieChartIcon}
      title="Revenue vs. Expense"
      subtitle="How much of the money moving is coming in vs. going out."
      rangeLabel={rangeLabel}
      footer={
        <div className="px-6 pb-6 pt-4 border-t">
          <div
            className={`rounded-lg border px-4 py-4 flex flex-wrap items-center justify-between gap-3 ${
              isProfit ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`hidden sm:flex h-9 w-9 items-center justify-center rounded-lg ${
                  isProfit ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                }`}
              >
                {isProfit ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {isProfit ? "Net Profit" : "Net Loss"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Total Revenue − Total Expenses, this period.</p>
              </div>
            </div>
            <span
              className={`text-xl font-bold tabular-nums ${isProfit ? "text-emerald-700" : "text-rose-700"}`}
            >
              {isProfit ? currency.format(analytics.net.profit) : `(${currency.format(analytics.net.loss)})`}
            </span>
          </div>
        </div>
      }
    >
      <PieChart
        slices={slices}
        centerLabel={isProfit ? currency.format(analytics.net.profit) : `(${currency.format(analytics.net.loss)})`}
        centerSubLabel={isProfit ? "Net Profit" : "Net Loss"}
        size={180}
      />
    </DonutCard>
  );
}
/** Revenue composition — Tuition vs. Demo, tinted from the revenue hue. */
export function RevenueCompositionDonut({
  analytics,
  rangeLabel,
}: {
  analytics: ReturnType<typeof useAccountsAnalytics>["analytics"];
  rangeLabel: string;
}) {
  if (!analytics) return null;
  const slices: PieChartSlice[] = [
    { label: "Tuition", value: analytics.revenue.tuitionRevenue, color: REVENUE_TINTS[0] },
    { label: "Demo", value: analytics.revenue.demoRevenue, color: REVENUE_TINTS[1] },
  ];

  return (
    <DonutCard
      icon={TrendingUp}
      title="Revenue Composition"
      subtitle="What Total Revenue is made of."
      rangeLabel={rangeLabel}
    >
      <PieChart
        slices={slices}
        centerLabel={currency.format(analytics.revenue.totalRevenue)}
        centerSubLabel="Total Revenue"
        size={180}
      />
    </DonutCard>
  );
}
/** Expense composition — Payouts / Referral Rewards / Wallet Credits, tinted from the expense hue. */
export function ExpenseCompositionDonut({
  analytics,
  rangeLabel,
}: {
  analytics: ReturnType<typeof useAccountsAnalytics>["analytics"];
  rangeLabel: string;
}) {
  if (!analytics) return null;
  const slices: PieChartSlice[] = [
    { label: "Teacher Payouts", value: analytics.expense.teacherPayouts, color: EXPENSE_TINTS[0] },
    { label: "Referral Rewards", value: analytics.expense.referralRewards, color: EXPENSE_TINTS[1] },
    { label: "Wallet Credits", value: analytics.expense.manualWalletCredits, color: EXPENSE_TINTS[2] },
  ];

  return (
    <DonutCard
      icon={TrendingDown}
      title="Expense Composition"
      subtitle="What Total Expense is made of."
      rangeLabel={rangeLabel}
    >
      <PieChart
        slices={slices}
        centerLabel={currency.format(analytics.expense.totalExpense)}
        centerSubLabel="Total Expense"
        size={180}
      />
    </DonutCard>
  );
}
/**
 * Teacher Payout Status — one donut: what share of total payout amount
 * sits in each workflow status. Reads from the same `PAYOUT_STATUS_COLORS`
 * map used elsewhere, so a color always means the same status.
 */
export function PayoutStatusDonut({
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

  const slices: PieChartSlice[] = rows.map((r) => ({
    label: `${PAYOUT_STATUS_LABELS[r.status] ?? r.status} (${r.count})`,
    value: r.amount,
    color: PAYOUT_STATUS_COLORS[r.status] ?? "#9ca3af",
  }));

  return (
    <DonutCard
      icon={ReceiptText}
      title="Teacher Payout Status"
      subtitle="Every Tuition Ledger row for the period, by current payout status."
      rangeLabel={rangeLabel}
      footer={
        rows.length > 0 ? (
          <div className="px-6 py-3 border-t bg-gray-50 flex items-center justify-between text-sm">
            <span className="font-semibold text-gray-700">Total</span>
            <span className="font-semibold text-gray-800 tabular-nums">
              {currency.format(totalAmount)}{" "}
              <span className="text-gray-400 font-normal">({totalCount} rows)</span>
            </span>
          </div>
        ) : undefined
      }
    >
      <PieChart slices={slices} centerLabel={currency.format(totalAmount)} centerSubLabel="Total" size={180} />
    </DonutCard>
  );
}
