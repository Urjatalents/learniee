"use client";

import { useState } from "react";
import Link from "next/link";
import { Receipt } from "lucide-react";

import { useInvoices, type InvoiceView, type InvoiceType } from "@/features/parent/hooks/useInvoices";
import { useParentRefundRequests } from "@/features/refunds/hooks/useRefundRequests";
import ErrorBanner from "@/features/shared/components/ErrorBanner";
import { REFUND_STATUS_LABELS, getRefundStatusStyle } from "@/features/shared/utils/refundStatus";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const TYPE_LABEL: Record<InvoiceType, string> = {
  ENROLLMENT_PAYMENT: "Enrollment",
  DEMO_BOOKING_PAYMENT: "Demo booking",
  WALLET_TOPUP: "Wallet top-up",
};

/**
 * Invoices (Sep 11, 2026) — a receipt for every real payment this
 * Parent has made (Enrollment, paid Demo booking, Wallet top-up).
 * This is the "standalone Payments-history screen" the sidebar's
 * "Payments" link already pointed at with no page behind it yet
 * (05-MODULE-SPECS-INDEX.md) — filling that gap rather than adding
 * a new nav entry.
 */
export default function ParentPaymentsPage() {
  const { invoices, loading, error } = useInvoices();
  const { requests, error: refundError, submitting, submit, cancel } = useParentRefundRequests();
  const [refundFor, setRefundFor] = useState<InvoiceView | null>(null);
  const [reason, setReason] = useState("");

  // Newest request per invoice (the list is newest first).
  function requestFor(invoiceId: string) {
    return requests.find((r) => r.invoiceId === invoiceId);
  }

  async function sendRefundRequest() {
    if (!refundFor || reason.trim().length < 10) return;

    if (await submit(refundFor.id, reason.trim())) {
      setRefundFor(null);
      setReason("");
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-violet-900">Payments</h1>
        <p className="text-gray-500 mt-1">
          Every invoice for money you've paid — Enrollments, paid demos, and Wallet
          top-ups.
        </p>
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}
      {refundError && <ErrorBanner>{refundError}</ErrorBanner>}

      <div className="bg-white border rounded-xl overflow-hidden">
        {loading ? (
          <p className="text-gray-500 text-center py-8">Loading…</p>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Receipt className="mx-auto mb-2 text-gray-300" size={32} />
            No invoices yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-4 py-2">Invoice #</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Description</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2 text-right">&nbsp;</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-t">
                    <td className="px-4 py-2 font-mono text-xs text-gray-600 whitespace-nowrap">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                      {dateFmt.format(new Date(inv.issuedAt))}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">{TYPE_LABEL[inv.type]}</td>
                    <td className="px-4 py-2 text-gray-600">{inv.description}</td>
                    <td className="px-4 py-2 text-right font-medium whitespace-nowrap">
                      {currency.format(inv.amount)}
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <Link
                        href={`/parent/payments/${inv.id}`}
                        className="text-violet-700 hover:text-violet-900 font-medium"
                      >
                        View
                      </Link>
                      {inv.type !== "WALLET_TOPUP" && (() => {
                        const refund = requestFor(inv.id);

                        if (!refund || refund.status === "CANCELLED") {
                          return (
                            <button
                              type="button"
                              onClick={() => setRefundFor(inv)}
                              className="ml-4 text-gray-600 hover:text-gray-900 font-medium"
                            >
                              Request refund
                            </button>
                          );
                        }

                        return (
                          <span className="ml-4 inline-flex items-center gap-2">
                            <span
                              title={refund.adminNote ?? undefined}
                              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getRefundStatusStyle(refund.status)}`}
                            >
                              {REFUND_STATUS_LABELS[refund.status]}
                              {refund.status === "APPROVED" && refund.approvedAmount != null
                                ? ` (${currency.format(refund.approvedAmount)})`
                                : ""}
                            </span>
                            {refund.status === "PENDING" && (
                              <button
                                type="button"
                                onClick={() => cancel(refund.id)}
                                className="text-xs text-gray-500 hover:text-gray-800 underline"
                              >
                                Withdraw
                              </button>
                            )}
                            {refund.status === "REJECTED" && (
                              <button
                                type="button"
                                onClick={() => setRefundFor(inv)}
                                className="text-xs text-gray-500 hover:text-gray-800 underline"
                              >
                                Ask again
                              </button>
                            )}
                          </span>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {refundFor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setRefundFor(null)}
        >
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-800">Request a refund</h2>
            <p className="text-sm text-gray-500 mt-1">
              {refundFor.invoiceNumber} · {currency.format(refundFor.amount)}
            </p>
            <p className="text-xs text-gray-500 mt-3">
              Nothing is refunded until an admin approves it. If approved, the admin sets the amount and it is added to
              your Wallet. See the{" "}
              <Link href="/refunds" className="text-violet-700 underline">
                Refund Policy
              </Link>
              .
            </p>
            <label className="block text-sm text-gray-600 mt-4">
              Why do you want a refund? (10 to 1000 characters)
              <textarea
                className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 outline-none text-sm text-gray-800 focus:border-violet-400 min-h-[110px]"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={1000}
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRefundFor(null)}
                className="text-sm font-semibold text-gray-600 border px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting || reason.trim().length < 10}
                onClick={sendRefundRequest}
                className="text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 px-4 py-2 rounded-lg disabled:opacity-60"
              >
                {submitting ? "Sending…" : "Send to admin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
