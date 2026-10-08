import {
    type AccountsAnalytics
} from "@/features/accounts/hooks/useAccountsAnalytics";
import type { LedgerPayoutStatus } from "@prisma/client";

export const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
// One color family per *meaning*, reused everywhere that meaning shows up,
// instead of a different rainbow per chart. Green always means "revenue /
// money in / good"; rose always means "expense / money out"; the two
// composition scales are just lighter tints of the same hue so a
// sub-category still visibly belongs to its parent total.
export const REVENUE_MAIN = "#059669";
 // emerald-600
export const EXPENSE_MAIN = "#e11d48";
 // rose-600
export const REVENUE_TINTS = ["#059669", "#6ee7b7"];
 // Tuition, Demo
export const EXPENSE_TINTS = ["#e11d48", "#fb7185", "#fecdd3"];
 // Teacher Payouts, Referral Rewards, Wallet Credits

// Payout status is a workflow stage, not a revenue/expense split, so it gets
// its own small palette — but each color still means one fixed thing
// everywhere it appears.
export const PAYOUT_STATUS_COLORS: Partial<Record<LedgerPayoutStatus, string>> = {
  PENDING_VERIFICATION: "#64748b", // slate — waiting
  ON_HOLD: "#f59e0b", // amber — needs a decision
  QUEUED_FOR_PAYMENT: "#7e2bf1", // brand violet — on its way
  PAID: "#059669", // emerald — done
  REJECTED: "#e11d48", // rose — money not going out
  EXPIRED: "#9ca3af", // gray — stale
  APPROVED: "#0d9488", // teal — legacy status
};
// Every figure the "Build Your Own Breakdown" donut can show, each with a
// fixed color and how to read it off `AccountsAnalytics`. Ticking any subset
// treats those figures as slices of one combined total — it doesn't assume
// the ticked figures are mutually-exclusive parts of a single whole (Net
// Profit, for instance, is *derived from* Revenue and Expense, not separate
// money), so it's a flexible comparison view, not another "100% of X" chart.
export type MetricKey =
  | "totalRevenue"
  | "tuitionRevenue"
  | "demoRevenue"
  | "totalExpense"
  | "teacherPayouts"
  | "referralRewards"
  | "walletCredits"
  | "netProfit"
  | "netLoss"
  | "platformProfit";
export const METRIC_DEFS: Record<
  MetricKey,
  { label: string; color: string; getValue: (a: AccountsAnalytics) => number }
> = {
  totalRevenue: { label: "Total Revenue", color: REVENUE_MAIN, getValue: (a) => a.revenue.totalRevenue },
  tuitionRevenue: { label: "Tuition Revenue", color: REVENUE_TINTS[0], getValue: (a) => a.revenue.tuitionRevenue },
  demoRevenue: { label: "Demo Revenue", color: REVENUE_TINTS[1], getValue: (a) => a.revenue.demoRevenue },
  totalExpense: { label: "Total Expense", color: EXPENSE_MAIN, getValue: (a) => a.expense.totalExpense },
  teacherPayouts: { label: "Teacher Payouts", color: EXPENSE_TINTS[0], getValue: (a) => a.expense.teacherPayouts },
  referralRewards: {
    label: "Referral Rewards",
    color: EXPENSE_TINTS[1],
    getValue: (a) => a.expense.referralRewards,
  },
  walletCredits: {
    label: "Wallet Credits",
    color: EXPENSE_TINTS[2],
    getValue: (a) => a.expense.manualWalletCredits,
  },
  netProfit: { label: "Net Profit", color: "#0ea5e9", getValue: (a) => a.net.profit },
  netLoss: { label: "Net Loss", color: "#f97316", getValue: (a) => a.net.loss },
  platformProfit: { label: "Platform Profit", color: "#7e2bf1", getValue: (a) => a.profit.platformProfit },
};
export const METRIC_ORDER: MetricKey[] = [
  "totalRevenue",
  "tuitionRevenue",
  "demoRevenue",
  "totalExpense",
  "teacherPayouts",
  "referralRewards",
  "walletCredits",
  "netProfit",
  "netLoss",
  "platformProfit",
];
// A sensible starting selection — roughly what was asked for: Profit, Loss,
// Total Expense, Total Revenue, Teacher Payouts. Net Profit and Net Loss are
// both ticked by default but one of them is always ₹0 (only one applies for
// any given period), so only the one that applies actually shows up.
export const DEFAULT_SELECTED_METRICS: MetricKey[] = [
  "totalRevenue",
  "totalExpense",
  "teacherPayouts",
  "netProfit",
  "netLoss",
];
export type PresetId = "all" | "this_month" | "last_month" | "this_year" | "custom";
export const PRESETS: { id: PresetId; label: string }[] = [
  { id: "all", label: "All Time" },
  { id: "this_month", label: "This Month" },
  { id: "last_month", label: "Last Month" },
  { id: "this_year", label: "This Year" },
  { id: "custom", label: "Custom Range" },
];
export const PAYOUT_STATUS_LABELS: Record<LedgerPayoutStatus, string> = {
  PENDING_VERIFICATION: "Pending Verification",
  ON_HOLD: "On Hold",
  QUEUED_FOR_PAYMENT: "Queued for Payment",
  PAID: "Paid",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
  APPROVED: "Approved (legacy)",
};
