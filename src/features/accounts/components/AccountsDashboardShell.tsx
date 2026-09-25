"use client";

import { useState } from "react";

import {
  Download,
  Wallet,
  Video,
  Users,
  AlertTriangle,
  Landmark,
} from "lucide-react";

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
 *
 * KPI row: four cards, each with a colored icon badge, an uppercase
 * label and a large tabular figure — same four numbers as before, no
 * change to how they're computed, just a less flat/empty look than a
 * single ruled strip. Section nav is a pill-style segmented control
 * instead of underlined tabs, which reads clearer against the icon
 * cards above it.
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

  const kpis: {
    label: string;
    value: string;
    icon: typeof Wallet;
    iconBg: string;
    iconColor: string;
    valueColor: string;
  }[] = [
    {
      label: "Tuition Revenue",
      value: currency.format(summary.totalTuitionRevenue),
      icon: Landmark,
      iconBg: "bg-violet-50",
      iconColor: "text-brand",
      valueColor: "text-gray-800",
    },
    {
      label: "Demo Revenue",
      value: currency.format(summary.totalDemoRevenue),
      icon: Video,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      valueColor: "text-gray-800",
    },
    {
      label: "Enrollments",
      value: String(summary.totalEnrollments),
      icon: Users,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      valueColor: "text-gray-800",
    },
    {
      label: "Due Within 5 Days",
      value: String(summary.dueSoonCount),
      icon: AlertTriangle,
      iconBg: summary.dueSoonCount > 0 ? "bg-amber-50" : "bg-gray-50",
      iconColor: summary.dueSoonCount > 0 ? "text-amber-600" : "text-gray-400",
      valueColor: summary.dueSoonCount > 0 ? "text-amber-600" : "text-gray-800",
    },
  ];

  return (
    <div className="max-w-[1400px] mx-auto p-8">
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-start gap-3">
          <div className="hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <Wallet size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{heading}</h1>
            <p className="text-sm text-gray-500 mt-1">{subheading}</p>
          </div>
        </div>
        <a
          href="/api/accounts/export"
          className="inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-colors"
        >
          <Download size={16} />
          Download Excel (.xlsx)
        </a>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-white rounded-xl border shadow-sm p-5">
              <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${k.iconBg} ${k.iconColor} mb-3`}>
                <Icon size={18} />
              </div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{k.label}</p>
              <p className={`text-2xl font-bold mt-1 tabular-nums ${k.valueColor}`}>{k.value}</p>
            </div>
          );
        })}
      </div>

      <nav
        className="flex flex-wrap gap-1 p-1 mb-6 rounded-xl bg-gray-100 w-fit max-w-full overflow-x-auto"
        aria-label="Accounts dashboard sections"
      >
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`shrink-0 flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                active
                  ? "bg-white text-brand shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {t.label}
              {!!t.badge && (
                <span
                  className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-semibold ${
                    active ? "bg-yellow-100 text-yellow-700" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

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
