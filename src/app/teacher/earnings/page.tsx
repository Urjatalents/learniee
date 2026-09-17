"use client";

import Link from "next/link";
import { IndianRupee, Clock, ShieldAlert, ShieldCheck, Wallet } from "lucide-react";

import {
  useTeacherEarnings,
  type LedgerPayoutStatusView,
  type PayoutRecordStatusView,
} from "@/features/teacher/hooks/useTeacherEarnings";
import ErrorBanner from "@/features/shared/components/ErrorBanner";

/**
 * "Earnings" — the Teacher-facing counterpart to the Tuition Ledger
 * / Payment Queue that Accounts already has. Previously the one gap
 * flagged across 01-PROJECT-STATUS.md/04-BUILD-PLAN-TIMELINE.md:
 * payout money existed end-to-end (TuitionLedgerEntry →
 * Accounts' Verify → Admin review → mass-pay → PayoutRecord) with
 * nothing surfacing it to the Teacher it belongs to. Entirely
 * read-only — nothing on this page can move a cycle; that still only
 * happens in Accounts'/Admin's own screens.
 */

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const LEDGER_STATUS_STYLE: Record<LedgerPayoutStatusView, string> = {
  PENDING_VERIFICATION: "bg-amber-100 text-amber-700",
  ON_HOLD: "bg-orange-100 text-orange-700",
  QUEUED_FOR_PAYMENT: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  EXPIRED: "bg-orange-100 text-orange-700",
  APPROVED: "bg-blue-100 text-blue-700",
};

const RECORD_STATUS_STYLE: Record<PayoutRecordStatusView, string> = {
  SUCCESS: "bg-green-100 text-green-700",
  SKIPPED_NO_BANK_ACCOUNT: "bg-orange-100 text-orange-700",
  FAILED: "bg-red-100 text-red-700",
};

function StatusPill({ status, styles }: { status: string; styles: Record<string, string> }) {
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {status.replaceAll("_", " ").toLowerCase()}
    </span>
  );
}

function StatCard({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: "teacher" | "warn";
}) {
  return (
    <div
      className={`rounded-2xl p-4 border ${
        emphasis === "teacher"
          ? "bg-green-50 border-green-100"
          : emphasis === "warn"
            ? "bg-orange-50 border-orange-100"
            : "bg-gray-50 border-gray-100"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 font-heading text-lg font-bold text-gray-800">{value}</p>
    </div>
  );
}

export default function TeacherEarningsPage() {
  const { ledgerEntries, payoutRecords, bankAccountStatus, loading, error } = useTeacherEarnings();

  const totalPaid = ledgerEntries
    .filter((e) => e.payoutStatus === "PAID")
    .reduce((sum, e) => sum + e.monthlyTeacherPay, 0);

  const queuedForPayment = ledgerEntries
    .filter((e) => e.payoutStatus === "QUEUED_FOR_PAYMENT")
    .reduce((sum, e) => sum + e.monthlyTeacherPay, 0);

  const awaitingVerification = ledgerEntries.filter(
    (e) => e.payoutStatus === "PENDING_VERIFICATION" || e.payoutStatus === "EXPIRED",
  ).length;

  const needsAttention = ledgerEntries.filter(
    (e) => e.payoutStatus === "ON_HOLD" || e.payoutStatus === "REJECTED",
  ).length;

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
          <Wallet size={20} />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Earnings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Your Tuition Ledger cycles and payout history — 70% of each completed cycle&apos;s
            monthly rate.
          </p>
        </div>
      </div>

      {!loading && bankAccountStatus !== "APPROVED" && (
        <div className="mb-6 rounded-xl p-4 flex items-start gap-3 text-sm bg-orange-100 text-orange-700">
          {bankAccountStatus === "PENDING" ? (
            <Clock size={18} className="shrink-0 mt-0.5" />
          ) : (
            <ShieldAlert size={18} className="shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-medium">
              {bankAccountStatus === "PENDING" &&
                "Your bank account is pending Admin approval — payouts can't reach you until it's approved."}
              {bankAccountStatus === "REJECTED" &&
                "Your bank account was rejected — resubmit it before a payout can reach you."}
              {bankAccountStatus === "NONE" &&
                "You haven't added a bank account yet — nothing can be paid out until you do."}
            </p>
            <Link href="/teacher/bank-account" className="mt-1 inline-block underline font-medium">
              {bankAccountStatus === "NONE" ? "Add bank account" : "Review bank account"}
            </Link>
          </div>
        </div>
      )}

      {!loading && bankAccountStatus === "APPROVED" && (
        <div className="mb-6 rounded-xl p-4 flex items-center gap-3 text-sm bg-green-100 text-green-700">
          <ShieldCheck size={18} className="shrink-0" />
          <p className="font-medium">
            Bank account approved — you&apos;re eligible for payouts.
          </p>
        </div>
      )}

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <StatCard label="Total Paid" value={currency.format(totalPaid)} emphasis="teacher" />
            <StatCard label="Queued for Payment" value={currency.format(queuedForPayment)} />
            <StatCard label="Awaiting Verification" value={String(awaitingVerification)} />
            <StatCard
              label="Needs Attention"
              value={String(needsAttention)}
              emphasis={needsAttention > 0 ? "warn" : undefined}
            />
          </div>

          <section className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">
              Ledger — cycle by cycle
            </h2>
            {ledgerEntries.length === 0 ? (
              <p className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-2xl p-6 text-center">
                No completed cycles yet. A row appears here as soon as one of your Enrollments
                finishes a billing cycle.
              </p>
            ) : (
              <div className="bg-white border rounded-2xl shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Student / Subject</th>
                      <th className="px-3 py-2">Cycle</th>
                      <th className="px-3 py-2 text-right">Your Pay</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {ledgerEntries.map((entry) => (
                      <tr key={entry.id}>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {dateFmt.format(new Date(entry.transactionDate))}
                        </td>
                        <td className="px-3 py-2">
                          {entry.childName}
                          {entry.subject ? ` · ${entry.subject}` : ""}
                        </td>
                        <td className="px-3 py-2">#{entry.cycleNumber}</td>
                        <td className="px-3 py-2 text-right font-medium">
                          {currency.format(entry.monthlyTeacherPay)}
                        </td>
                        <td className="px-3 py-2">
                          <StatusPill status={entry.payoutStatus} styles={LEDGER_STATUS_STYLE} />
                          {entry.payoutStatus === "ON_HOLD" && entry.holdReason && (
                            <p className="mt-1 text-xs text-gray-500">{entry.holdReason}</p>
                          )}
                          {entry.payoutStatus === "REJECTED" && entry.rejectionReason && (
                            <p className="mt-1 text-xs text-gray-500">{entry.rejectionReason}</p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">
              Payout History
            </h2>
            {payoutRecords.length === 0 ? (
              <p className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-2xl p-6 text-center">
                No payouts have been run for you yet — cycles show up here once Accounts pays out
                a batch that includes you.
              </p>
            ) : (
              <div className="bg-white border rounded-2xl shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Cycles</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {payoutRecords.map((record) => (
                      <tr key={record.id}>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {dateFmt.format(new Date(record.createdAt))}
                        </td>
                        <td className="px-3 py-2">{record.cycleCount}</td>
                        <td className="px-3 py-2 text-right font-medium">
                          <span className="inline-flex items-center gap-0.5">
                            <IndianRupee size={12} />
                            {record.amount.toLocaleString("en-IN")}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <StatusPill status={record.status} styles={RECORD_STATUS_STYLE} />
                          {record.status === "SKIPPED_NO_BANK_ACCOUNT" && record.failureReason && (
                            <p className="mt-1 text-xs text-gray-500">{record.failureReason}</p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
