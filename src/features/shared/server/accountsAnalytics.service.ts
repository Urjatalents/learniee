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
 * Revenue and expense are two different pie charts on purpose:
 *  - Expense distribution: where the money that leaves the platform
 *    actually goes (Teacher Payouts, Referral Rewards, manual Wallet
 *    credits/refunds). Wallet top-ups are excluded — that's a
 *    parent funding their own Wallet, not a platform expense.
 *  - Overall Accounts (P&L): total revenue split into what's paid out
 *    (Expense) vs. what the platform keeps (Profit), across Tuition +
 *    Demo revenue. Demo revenue has no teacher-share field on
 *    `DemoBooking` (see `03-DATA-MODEL.md`), so it's booked as pure
 *    platform profit here, same as everywhere else in this codebase.
 */

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
    platformProfit: number;
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export async function getAccountsAnalytics(): Promise<AccountsAnalytics> {
  const realizedStatuses = [LedgerPayoutStatus.QUEUED_FOR_PAYMENT, LedgerPayoutStatus.PAID];

  const [ledgerTotalAgg, ledgerRealizedAgg, demoAgg, walletAgg] = await Promise.all([
    prisma.tuitionLedgerEntry.aggregate({
      _sum: { totalAmount: true },
    }),
    prisma.tuitionLedgerEntry.aggregate({
      where: { payoutStatus: { in: realizedStatuses } },
      _sum: { monthlyTeacherPay: true, profits: true },
    }),
    prisma.demoBooking.aggregate({
      where: { isPaid: true, razorpayPaymentId: { not: null } },
      _sum: { amount: true },
    }),
    prisma.walletTransaction.groupBy({
      by: ["referenceType"],
      where: { type: "CREDIT", referenceType: { in: ["referral", "MANUAL_ADJUSTMENT"] } },
      _sum: { amount: true },
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
  // the rest of the app (see file header).
  const platformProfit = ledgerProfit + demoRevenue;

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
  };
}
