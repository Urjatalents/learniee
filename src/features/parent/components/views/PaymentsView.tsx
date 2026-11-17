"use client";

import { useState } from "react";
import { Receipt } from "lucide-react";

import { PD_BTN_TXT, PdEmpty } from "@/features/parent/components/courses/pdUi";
import { Tag } from "@/features/parent/components/home/HomeBits";
import { usePdToast } from "@/features/parent/components/courses/usePdToast";
import InvoiceDialog from "@/features/parent/components/payments/InvoiceDialog";
import RefundDialog from "@/features/parent/components/payments/RefundDialog";
import {
  INVOICE_TYPE_LABEL,
  PD_CARD_FLUSH,
  PdBanner,
  PdSkeleton,
  dLong,
  inr2,
} from "@/features/parent/components/payments/paymentsUi";
import { useInvoices, type InvoiceView } from "@/features/parent/hooks/useInvoices";
import { useParentRefundRequests, type ParentRefundRequest } from "@/features/refunds/hooks/useRefundRequests";

/**
 * Payments tab — every invoice for money the Parent has paid (Enrollment, renewal, paid demo,
 * demo coupons, Wallet top-up) with the refund request flow. Data: /api/parent/invoices and
 * /api/parent/refund-requests (both already live-refreshing hooks).
 */
export default function PaymentsView() {
  const { invoices, loading, error } = useInvoices();
  const { requests, error: refundError, submitting, submit, cancel } = useParentRefundRequests();
  const { toast, toastNode } = usePdToast();
  const [viewing, setViewing] = useState<InvoiceView | null>(null);
  const [refundFor, setRefundFor] = useState<InvoiceView | null>(null);

  // The list is newest first, so find() gives the latest request per invoice.
  const requestFor = (invoiceId: string) => requests.find((r) => r.invoiceId === invoiceId);

  async function sendRefund(reason: string) {
    if (!refundFor) return false;
    const ok = await submit(refundFor.id, reason);
    if (ok) toast("Refund request sent to admin");
    return ok;
  }

  async function withdraw(r: ParentRefundRequest) {
    await cancel(r.id);
    toast("Refund request withdrawn");
  }

  /** Design `refTag`. */
  function refundTag(inv: InvoiceView) {
    const r = requestFor(inv.id);
    if (!r || r.status === "CANCELLED") return null;
    if (r.status === "APPROVED") {
      return (
        <Tag tone="green">
          Refunded to wallet{r.approvedAmount != null ? ` (${inr2(r.approvedAmount)})` : ""}
        </Tag>
      );
    }
    if (r.status === "REJECTED") return <Tag tone="red">Refund not approved</Tag>;
    return <Tag tone="amber">Refund requested — awaiting admin</Tag>;
  }

  /** Design `refBtn`. */
  function refundButton(inv: InvoiceView) {
    if (inv.type === "WALLET_TOPUP") return null;
    const r = requestFor(inv.id);

    if (!r || r.status === "CANCELLED") {
      return (
        <button type="button" className={PD_BTN_TXT} onClick={() => setRefundFor(inv)}>
          Request refund
        </button>
      );
    }
    if (r.status === "PENDING") {
      return (
        <button type="button" className={PD_BTN_TXT} onClick={() => withdraw(r)}>
          Withdraw
        </button>
      );
    }
    if (r.status === "REJECTED") {
      return (
        <button type="button" className={PD_BTN_TXT} onClick={() => setRefundFor(inv)}>
          Ask again
        </button>
      );
    }
    return null;
  }

  return (
    <>
      <p className="mb-3 mt-5 text-[13px] text-pd-ink3">
        Every invoice for money you’ve paid — enrollments, paid demos, and wallet top-ups.
      </p>

      {(error || refundError) && (
        <div className="mb-3">
          <PdBanner tone="red">{error || refundError}</PdBanner>
        </div>
      )}

      <div className={PD_CARD_FLUSH}>
        {loading ? (
          <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-3 p-4">
            <PdSkeleton />
            <PdSkeleton />
            <PdSkeleton />
          </div>
        ) : invoices.length === 0 ? (
          <PdEmpty
            icon={Receipt}
            title="No invoices yet"
            text="When you pay for a class, a demo or a wallet top-up, the invoice shows up here."
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="overflow-x-auto max-[719px]:hidden">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    {["Invoice #", "Date", "Type", "Description"].map((h) => (
                      <th key={h} className={TH}>
                        {h}
                      </th>
                    ))}
                    <th className={`${TH} text-right`}>Amount</th>
                    <th className={TH} />
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => {
                    const tag = refundTag(inv);
                    return (
                      <tr key={inv.id} className="border-b border-pd-line last:border-b-0">
                        <td className={`${TD} whitespace-nowrap`}>
                          <b className="font-semibold">{inv.invoiceNumber}</b>
                        </td>
                        <td className={`${TD} whitespace-nowrap`}>{dLong(inv.issuedAt)}</td>
                        <td className={TD}>{INVOICE_TYPE_LABEL[inv.type] ?? inv.type}</td>
                        <td className={TD}>
                          {inv.description}
                          {tag && <div className="mt-1.5">{tag}</div>}
                        </td>
                        <td className={`${TD} text-right`}>
                          <b className="font-semibold">{inr2(inv.amount)}</b>
                        </td>
                        <td className={`${TD} whitespace-nowrap`}>
                          <button type="button" className={PD_BTN_TXT} onClick={() => setViewing(inv)}>
                            View
                          </button>
                          {refundButton(inv)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Phones: one block per invoice */}
            <div className="min-[720px]:hidden">
              {invoices.map((inv) => {
                const tag = refundTag(inv);
                return (
                  <div key={inv.id} className="flex flex-col gap-2 border-t border-pd-line p-4 first:border-t-0">
                    <div className="flex justify-between gap-3 font-semibold">
                      <span>{inv.invoiceNumber}</span>
                      <span>{inr2(inv.amount)}</span>
                    </div>
                    <div className="text-[13px] text-pd-ink2">
                      {dLong(inv.issuedAt)} · {INVOICE_TYPE_LABEL[inv.type] ?? inv.type}
                      <br />
                      {inv.description}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {tag}
                      <button type="button" className={PD_BTN_TXT} onClick={() => setViewing(inv)}>
                        View
                      </button>
                      {refundButton(inv)}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {viewing && (
        <InvoiceDialog invoice={viewing} refundTag={refundTag(viewing)} onClose={() => setViewing(null)} />
      )}
      {refundFor && (
        <RefundDialog
          invoice={refundFor}
          submitting={submitting}
          onSubmit={sendRefund}
          onClose={() => setRefundFor(null)}
        />
      )}
      {toastNode}
    </>
  );
}

/* Design `.tbl` cells */
const TH = "whitespace-nowrap border-b border-pd-line px-4 py-3 text-left text-xs font-semibold text-pd-ink3";
const TD = "px-4 py-3 align-top";
