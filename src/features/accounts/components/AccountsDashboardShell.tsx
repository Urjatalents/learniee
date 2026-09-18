"use client";

import { useState } from "react";

import type {
  TuitionLedgerRow,
  DemoBookingRow,
  OngoingCycleRow,
} from "@/features/accounts/server/export.service";
import { useTuitionLedger } from "@/features/accounts/hooks/useTuitionLedger";
import OngoingCyclesPanel from "@/features/accounts/components/OngoingCyclesPanel";
import TuitionLedgerPanel from "@/features/accounts/components/TuitionLedgerPanel";
import PaymentQueuePanel from "@/features/accounts/components/PaymentQueuePanel";
import RevenueLedgerPanel from "@/features/accounts/components/RevenueLedgerPanel";
import DemoBookingsPanel from "@/features/accounts/components/DemoBookingsPanel";
import WalletPanel from "@/features/accounts/components/WalletPanel";
import InvoicesPanel from "@/features/accounts/components/InvoicesPanel";
import AccountsAnalyticsPanel from "@/features/accounts/components/AccountsAnalyticsPanel";

interface AccountsDashboardShellProps {
  heading: string;
  subheading: string;
  summary: {
    totalTuitionRevenue: number;
    totalDemoRevenue: number;
    totalEnrollments: number;
    dueSoonCount: number;
  };
  ongoingCycleRows: OngoingCycleRow[];
  ledgerRows: TuitionLedgerRow[];
  demoRows: DemoBookingRow[];
}

type TabId =
  | "cycles"
  | "verify"
  | "payment-queue"
  | "revenue"
  | "demos"
  | "wallets"
  | "invoices"
  | "analytics";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/**
 * Accounts Dashboard shell — was previously four unrelated sections
 * (Payout Verification, Wallets, a differently-named "Tuition Ledger"
 * revenue table, Demo Bookings) all stacked vertically under two
 * separate headers on one page. Now one header, one KPI row, and one
 * tab strip so each section is clearly separated instead of
 * compressed into a single long scroll.
 *
 * "Ongoing Cycles" and "Payout Verification" are deliberately two
 * separate tabs, not one merged table: a cycle in progress (parent
 * already paid upfront, Teacher payout not decided yet) and a
 * completed cycle awaiting Accounts' Approve/Reject are different
 * moments in the same lifecycle, and showing them in one list was
 * the exact "cluttered together" complaint this redesign is for.
 *
 * Uses the same brand tokens (`text-brand`, `bg-brand`) and card
 * shell (`bg-white rounded-xl border shadow-sm`) as the rest of the
 * app instead of the one-off `purple-600` this page used before.
 */
export default function AccountsDashboardShell({
  heading,
  subheading,
  summary,
  ongoingCycleRows,
  ledgerRows,
  demoRows,
}: AccountsDashboardShellProps) {
  const [tab, setTab] = useState<TabId>("cycles");
  const ledger = useTuitionLedger();

  const tabs: { id: TabId; label: string; badge?: number }[] = [
    { id: "cycles", label: "Ongoing Cycles", badge: ongoingCycleRows.length || undefined },
    { id: "verify", label: "Verify Payouts", badge: ledger.summary?.pendingVerificationCount },
    { id: "payment-queue", label: "Payment Queue", badge: ledger.summary?.queuedForPaymentCount },
    { id: "revenue", label: "Revenue Ledger" },
    { id: "demos", label: "Demo Bookings" },
    { id: "wallets", label: "Parent Wallets" },
    { id: "invoices", label: "Invoices" },
    { id: "analytics", label: "Analytics" },
  ];

  return (
    <div className="max-w-[1400px] mx-auto p-8">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand">{heading}</h1>
          <p className="text-sm text-gray-500 mt-1">{subheading}</p>
        </div>
        <a
          href="/api/accounts/export"
          className="inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-colors"
        >
          ⬇ Download Excel (.xlsx)
        </a>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <p className="text-sm text-gray-500">Tuition Revenue</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">
            {currency.format(summary.totalTuitionRevenue)}
          </p>
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <p className="text-sm text-gray-500">Demo Revenue</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">
            {currency.format(summary.totalDemoRevenue)}
          </p>
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <p className="text-sm text-gray-500">Enrollments</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{summary.totalEnrollments}</p>
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <p className="text-sm text-gray-500">Due Within 5 Days</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{summary.dueSoonCount}</p>
        </div>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-1 overflow-x-auto -mb-px" aria-label="Accounts dashboard sections">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`shrink-0 flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  active
                    ? "border-brand text-brand"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {t.label}
                {!!t.badge && (
                  <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold">
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div>
        {tab === "cycles" && <OngoingCyclesPanel rows={ongoingCycleRows} />}
        {tab === "verify" && (
          <TuitionLedgerPanel
            entries={ledger.entries}
            summary={ledger.summary}
            loading={ledger.loading}
            error={ledger.error}
            actingOn={ledger.actingOn}
            proceed={ledger.proceed}
            hold={ledger.hold}
            reject={ledger.reject}
          />
        )}
        {tab === "payment-queue" && <PaymentQueuePanel />}
        {tab === "revenue" && <RevenueLedgerPanel rows={ledgerRows} />}
        {tab === "demos" && <DemoBookingsPanel rows={demoRows} />}
        {tab === "wallets" && <WalletPanel />}
        {tab === "invoices" && <InvoicesPanel />}
        {tab === "analytics" && <AccountsAnalyticsPanel />}
      </div>
    </div>
  );
}
