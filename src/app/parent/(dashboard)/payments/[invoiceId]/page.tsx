"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";

import type { InvoiceType, InvoiceView } from "@/features/parent/hooks/useInvoices";
import ErrorBanner from "@/features/shared/components/ErrorBanner";
import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";
import { COMPANY_INFO } from "@/lib/companyInfo";
import { isBackgroundRefresh } from "@/lib/refreshBus";

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

const dateTimeFmt = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const ITEM_LABEL: Record<InvoiceType, string> = {
  ENROLLMENT_PAYMENT: "Course enrollment",
  DEMO_BOOKING_PAYMENT: "Demo session booking",
  WALLET_TOPUP: "Wallet top-up",
  DEMO_COUPON_PURCHASE: "Demo coupons",
  CYCLE_RENEWAL_PAYMENT: "Course renewal",
};

/** Printable single-invoice view — `window.print()` is the "download as PDF" path, no PDF-generation dependency needed. */
export default function ParentInvoiceDetailPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const router = useRouter();

  const [invoice, setInvoice] = useState<InvoiceView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    // Silent when run by the live-update refresh: no spinner, and a
    // failed refresh keeps what is already on screen.
    const background = isBackgroundRefresh();

    try {
      if (!background) setLoading(true);
      const res = await fetch(`/api/parent/invoices/${invoiceId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch this invoice");
      }

      setInvoice(data.invoice);
      setError("");
    } catch (err) {
      console.error(err);
      if (!background) setError("Unable to load this invoice.");
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    void load();
  }, [load]);

  useAutoRefresh(() => load(), { paths: [`/api/parent/invoices/${invoiceId}`] });

  // "Download PDF" on the Payments page opens this page with ?print=1: show the print / save-as-PDF dialog once.
  useEffect(() => {
    if (!invoice) return;
    if (new URLSearchParams(window.location.search).get("print") !== "1") return;
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, [invoice?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="p-6 max-w-3xl mx-auto print:p-0 print:max-w-none">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <button
          type="button"
          onClick={() => router.push("/parent/payments")}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={16} /> Back to Payments
        </button>

        {invoice && (
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1 text-sm bg-brand text-white px-4 py-2 rounded-full font-medium hover:bg-brand-dark"
          >
            <Printer size={15} /> Print / Save as PDF
          </button>
        )}
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {loading ? (
        <p className="text-gray-500 text-center py-8">Loading…</p>
      ) : invoice ? (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm print:border-0 print:shadow-none font-sans text-gray-900">
          {/* Letterhead */}
          <div className="flex items-start justify-between gap-6 px-8 sm:px-10 pt-10 pb-6 border-b-2 border-gray-900">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                {COMPANY_INFO.legalName}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">{COMPANY_INFO.tagline}</p>
              <div className="text-xs text-gray-500 mt-3 leading-relaxed">
                {COMPANY_INFO.addressLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
                {(COMPANY_INFO.email || COMPANY_INFO.phone) && (
                  <p className="mt-1">
                    {COMPANY_INFO.email}
                    {COMPANY_INFO.email && COMPANY_INFO.phone ? " · " : ""}
                    {COMPANY_INFO.phone}
                  </p>
                )}
                {COMPANY_INFO.gstin && <p>GSTIN: {COMPANY_INFO.gstin}</p>}
              </div>
            </div>

            <div className="text-right shrink-0">
              <p className="text-lg font-semibold uppercase tracking-wide text-gray-800">
                Receipt
              </p>
              <span className="inline-block mt-1 text-[11px] font-semibold uppercase tracking-wide text-green-700 bg-green-50 border border-green-200 rounded px-2 py-0.5">
                Paid
              </span>
              <dl className="mt-3 text-xs text-gray-500 space-y-1">
                <div className="flex justify-end gap-2">
                  <dt>Receipt No.</dt>
                  <dd className="font-mono text-gray-800">{invoice.invoiceNumber}</dd>
                </div>
                <div className="flex justify-end gap-2">
                  <dt>Date</dt>
                  <dd className="text-gray-800">{dateFmt.format(new Date(invoice.issuedAt))}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Bill to / payment details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 px-8 sm:px-10 py-6 border-b border-gray-200">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
                Billed to
              </p>
              <p className="text-sm font-medium text-gray-900">{invoice.billTo?.name ?? "—"}</p>
              {invoice.billTo?.addressLines.map((line) => (
                <p key={line} className="text-xs text-gray-500">
                  {line}
                </p>
              ))}
              {invoice.billTo?.email && (
                <p className="text-xs text-gray-500 mt-1">{invoice.billTo.email}</p>
              )}
              {invoice.billTo?.phone && (
                <p className="text-xs text-gray-500">{invoice.billTo.phone}</p>
              )}
            </div>

            <div className="sm:text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
                Payment details
              </p>
              <p className="text-xs text-gray-500">
                Paid on {dateTimeFmt.format(new Date(invoice.issuedAt))}
              </p>
              {invoice.razorpayPaymentId && (
                <p className="text-xs text-gray-500 break-all">
                  Reference: <span className="font-mono">{invoice.razorpayPaymentId}</span>
                </p>
              )}
            </div>
          </div>

          {/* Line items */}
          <div className="px-8 sm:px-10 py-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-300 text-left text-[11px] uppercase tracking-wide text-gray-400">
                  <th className="pb-2 font-semibold">Description</th>
                  <th className="pb-2 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-4 pr-4">
                    <p className="font-medium text-gray-900">{ITEM_LABEL[invoice.type]}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{invoice.description}</p>
                  </td>
                  <td className="py-4 text-right tabular-nums text-gray-900">
                    {currency.format(invoice.amount)}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td className="pt-4 text-sm font-semibold text-gray-900">Total paid</td>
                  <td className="pt-4 text-right text-lg font-bold tabular-nums text-gray-900">
                    {currency.format(invoice.amount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Footer */}
          <div className="px-8 sm:px-10 py-5 border-t border-gray-200 bg-gray-50 print:bg-white rounded-b-lg">
            <p className="text-xs text-gray-500">
              This is a system-generated receipt for a payment made on {COMPANY_INFO.legalName}{" "}
              and does not require a signature or stamp.
            </p>
            {COMPANY_INFO.email && (
              <p className="text-xs text-gray-500 mt-1">
                Questions about this receipt? Write to {COMPANY_INFO.email}.
              </p>
            )}
          </div>
        </div>
      ) : (
        !error && <p className="text-gray-500 text-center py-8">Invoice not found.</p>
      )}
    </div>
  );
}
