import "server-only";

import { LedgerPayoutStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Pie-chart-ready aggregates for the Accounts/Admin "Analytics" tab
 * (`AccountsAnalyticsPanel.tsx`). Deliberately reuses the same
 * "realized payout" definition `tuitionLedger.service.ts`'s
 * `getLedgerSummary()` already uses — a cycle only counts toward
 * Teacher Payouts / Platform Profit once it's `QUEUED_FOR_PAYMENT` or
 * `PAID`, not while it's still sitting in Verification/On-Hold —
 * instead of inventing a second definition of "realized" here.
 *
 * Everything below feeds ONE selectable pie chart on the frontend
 * (Profit & Loss / Expense Distribution / Revenue Breakdown / Payout
 * Status), all computed together so switching the dropdown doesn't
 * need a new request:
 *  - Expense distribution: where the money that leaves the platform
 *    actually goes (Teacher Payouts, Referral Rewards, manual Wallet
 *    credits/refunds). Wallet top-ups are excluded — that's a
 *    parent funding their own Wallet, not a platform expense.
 *  - Overall Accounts (P&L): total revenue split into what's paid out
 *    (Expense) vs. what the platform keeps (Profit), across Tuition +
 *    Demo revenue. Demo revenue has no teacher-share field on
 *    `DemoBooking` (see `03-DATA-MODEL.md`), so it's booked as pure
 *    platform profit here, same as everywhere else in this codebase.
 *  - Payout status: every `TuitionLedgerEntry` bucketed by its
 *    current `payoutStatus` (amount + row count) — this is the
 *    "Teacher Payout" detail view, independent of the realized/not
 *    split the P&L and Expense views use.
 *
 * All four are optionally scoped to a date range (`AccountsAnalyticsRange`)
 * for the "Overall Performance" period picker — not just the current
 * month. Ledger rows are scoped by `transactionDate`, demo bookings by
 * `paidAt`, and wallet credits by `createdAt`; omit `from`/`to` for the
 * previous (all-time) behavior.
 */

export interface AccountsAnalyticsRange {
  from?: Date;
  to?: Date;
}

export interface PayoutStatusSlice {
  status: LedgerPayoutStatus;
  amount: number;
  count: number;
}

export interface AccountsAnalytics {
  revenue: {
    tuitionRevenue: number;
    demoRevenue: number;
    totalRevenue: number;
  };
  expense: {
    teacherPayouts: number;
    referralRewards: number;
    manualWalletCredits: number;
    totalExpense: number;
  };
  profit: {
    /** 0.30 × Monthly_rate on realized (queued-for-payment/paid) cycles + demo revenue — the resolved Profits formula (`06` #1). Always >= 0 by construction. */
    platformProfit: number;
  };
  /**
   * Net cash view for the range: totalRevenue - totalExpense. Separate from
   * `profit.platformProfit` (the resolved 70/30 ledger formula) — this also
   * nets out Referral Rewards and manual Wallet credits, which the ledger
   * formula does not subtract from Profits. Exactly one of profit/loss is
   * non-zero for a given range.
   */
  net: {
    profit: number;
    loss: number;
  };
  payoutStatusBreakdown: PayoutStatusSlice[];
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** `{ gte, lte }` filter object for a range field, or undefined if the range is fully open. */
function dateFilter(range?: AccountsAnalyticsRange) {
  if (!range || (!range.from && !range.to)) return undefined;

  const filter: { gte?: Date; lte?: Date } = {};
  if (range.from) filter.gte = range.from;
  if (range.to) filter.lte = range.to;
  return filter;
}

export async function getAccountsAnalytics(
  range?: AccountsAnalyticsRange,
): Promise<AccountsAnalytics> {
  const realizedStatuses = [LedgerPayoutStatus.QUEUED_FOR_PAYMENT, LedgerPayoutStatus.PAID];

  const transactionDate = dateFilter(range);
  const paidAt = dateFilter(range);
  const createdAt = dateFilter(range);

  const [ledgerTotalAgg, ledgerRealizedAgg, demoAgg, walletAgg, payoutStatusAgg] =
    await Promise.all([
      prisma.tuitionLedgerEntry.aggregate({
        where: transactionDate ? { transactionDate } : undefined,
        _sum: { totalAmount: true },
      }),
      prisma.tuitionLedgerEntry.aggregate({
        where: {
          payoutStatus: { in: realizedStatuses },
          ...(transactionDate ? { transactionDate } : {}),
        },
        _sum: { monthlyTeacherPay: true, profits: true },
      }),
      prisma.demoBooking.aggregate({
        where: {
          isPaid: true,
          razorpayPaymentId: { not: null },
          ...(paidAt ? { paidAt } : {}),
        },
        _sum: { amount: true },
      }),
      prisma.walletTransaction.groupBy({
        by: ["referenceType"],
        where: {
          type: "CREDIT",
          referenceType: { in: ["referral", "MANUAL_ADJUSTMENT"] },
          ...(createdAt ? { createdAt } : {}),
        },
        _sum: { amount: true },
      }),
      prisma.tuitionLedgerEntry.groupBy({
        by: ["payoutStatus"],
        where: transactionDate ? { transactionDate } : undefined,
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
    ]);

  const tuitionRevenue = Number(ledgerTotalAgg._sum.totalAmount ?? 0);
  const teacherPayouts = Number(ledgerRealizedAgg._sum.monthlyTeacherPay ?? 0);
  const ledgerProfit = Number(ledgerRealizedAgg._sum.profits ?? 0);
  const demoRevenue = Number(demoAgg._sum.amount ?? 0);

  const referralRewards = Number(
    walletAgg.find((w) => w.referenceType === "referral")?._sum.amount ?? 0,
  );
  const manualWalletCredits = Number(
    walletAgg.find((w) => w.referenceType === "MANUAL_ADJUSTMENT")?._sum.amount ?? 0,
  );

  const totalExpense = teacherPayouts + referralRewards + manualWalletCredits;
  const totalRevenue = tuitionRevenue + demoRevenue;
  // Demo revenue has no teacher-share — it's pure platform profit, same as
  // the rest of the app (see file header). Unchanged from before this patch.
  const platformProfit = ledgerProfit + demoRevenue;
  // Net cash view (new) — see the `net` field doc-comment above.
  const netResult = totalRevenue - totalExpense;

  const payoutStatusBreakdown: PayoutStatusSlice[] = payoutStatusAgg.map((row) => ({
    status: row.payoutStatus,
    amount: round2(Number(row._sum.totalAmount ?? 0)),
    count: row._count._all,
  }));

  return {
    revenue: {
      tuitionRevenue: round2(tuitionRevenue),
      demoRevenue: round2(demoRevenue),
      totalRevenue: round2(totalRevenue),
    },
    expense: {
      teacherPayouts: round2(teacherPayouts),
      referralRewards: round2(referralRewards),
      manualWalletCredits: round2(manualWalletCredits),
      totalExpense: round2(totalExpense),
    },
    profit: {
      platformProfit: round2(platformProfit),
    },
    net: {
      profit: round2(Math.max(0, netResult)),
      loss: round2(Math.max(0, -netResult)),
    },
    payoutStatusBreakdown,
  };
}
