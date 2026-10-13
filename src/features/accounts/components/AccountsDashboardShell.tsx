"use client";

import { useState } from "react";

import {
  Download,
  Wallet,
  Video,
  Users,
  AlertTriangle,
  Landmark,
  ChevronRight,
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
  /** Rendered inside the Admin shell: adds the breadcrumb, drops page padding. */
  embedded?: boolean;
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
  embedded = false,
}: AccountsDashboardShellProps) {
  const complaintsHref = embedded ? "/admin/complaints" : "/accounts/complaints";
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
      valueColor: "text-admin-ink",
    },
    {
      label: "Demo Revenue",
      value: currency.format(summary.totalDemoRevenue),
      icon: Video,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      valueColor: "text-admin-ink",
    },
    {
      label: "Enrollments",
      value: String(summary.totalEnrollments),
      icon: Users,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      valueColor: "text-admin-ink",
    },
    {
      label: "Due Within 5 Days",
      value: String(summary.dueSoonCount),
      icon: AlertTriangle,
      iconBg: summary.dueSoonCount > 0 ? "bg-amber-50" : "bg-gray-50",
      iconColor: summary.dueSoonCount > 0 ? "text-amber-600" : "text-gray-400",
      valueColor: summary.dueSoonCount > 0 ? "text-[#8a6500]" : "text-admin-ink",
    },
  ];

  return (
    <div className={embedded ? "flex flex-col gap-6" : "mx-auto max-w-[1400px] p-8 flex flex-col gap-6"}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          {embedded && (
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1.5 text-sm font-bold text-admin-muted"
            >
              <a href="/admin" className="text-brand-dark hover:underline">
                Overview
              </a>
              <ChevronRight className="size-3.5" aria-hidden="true" />
              <span>Money</span>
            </nav>
          )}
          <h1 className="font-heading text-3xl font-bold leading-tight text-admin-ink sm:text-4xl">
            {heading}
          </h1>
          <p className="text-[17px] text-admin-muted">{subheading}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={complaintsHref}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-admin-line bg-white px-[18px] text-[15px] font-extrabold text-admin-ink transition-colors hover:bg-admin-hover"
          >
            Complaints
          </a>
          <a
            href="/api/accounts/export"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-[18px] text-[15px] font-extrabold text-white transition-colors hover:bg-[#6a1fd6]"
          >
            <Download size={16} aria-hidden="true" />
            Download Excel (.xlsx)
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="flex flex-col gap-2 rounded-[18px] border border-admin-line bg-white p-5">
              <span className="flex size-10 items-center justify-center rounded-xl bg-admin-tint text-brand-dark">
                <Icon size={20} aria-hidden="true" />
              </span>
              <span className="text-sm font-bold text-admin-muted">{k.label}</span>
              <span className={`font-heading text-2xl font-extrabold tabular-nums sm:text-3xl ${k.valueColor}`}>
                {k.value}
              </span>
            </div>
          );
        })}
      </div>

      <nav
        className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-[14px] border border-admin-line bg-white p-1"
        aria-label="Accounts dashboard sections"
      >
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex min-h-11 shrink-0 items-center gap-2 rounded-[10px] px-[18px] text-[15px] transition-colors ${
                active
                  ? "bg-brand font-extrabold text-white"
                  : "font-bold text-admin-ink hover:bg-admin-hover"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {t.label}
              {!!t.badge && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[13px] ${
                    active ? "bg-brand-yellow text-admin-ink" : "bg-admin-tint text-brand-dark"
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
