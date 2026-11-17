"use client";

import { useState } from "react";
import Link from "next/link";

import PdDialog from "@/features/parent/components/courses/PdDialog";
import { PD_BTN_PRI, PD_BTN_SEC, PD_ERR, PD_LABEL } from "@/features/parent/components/courses/pdUi";
import type { InvoiceView } from "@/features/parent/hooks/useInvoices";
import { inr2 } from "@/features/parent/components/payments/paymentsUi";

const MIN = 10;
const MAX = 1000;

/** Design `refundDialog`. `onSubmit` resolves true when the request was sent (the dialog then closes). */
export default function RefundDialog({
  invoice,
  submitting,
  onSubmit,
  onClose,
}: {
  invoice: InvoiceView;
  submitting: boolean;
  onSubmit: (reason: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");

  async function send() {
    const text = reason.trim();
    if (text.length < MIN) {
      setErr(`Please tell us a little more (at least ${MIN} characters).`);
      return;
    }
    setErr("");
    if (await onSubmit(text)) onClose();
  }

  return (
    <PdDialog
      title="Request a refund"
      onClose={onClose}
      inlineFooter
      footer={
        <>
          <button type="button" onClick={onClose} className={PD_BTN_SEC}>
            Cancel
          </button>
          <button type="button" onClick={send} disabled={submitting} className={PD_BTN_PRI}>
            {submitting ? "Sending…" : "Send to admin"}
          </button>
        </>
      }
    >
      <p className="text-[13px] text-pd-ink3">
        {invoice.invoiceNumber} · {inr2(invoice.amount)}
      </p>
      <p className="text-sm">
        Nothing is refunded until an admin approves it. If approved, the admin sets the amount and it is added to
        your wallet. See the{" "}
        <Link href="/refunds" className="font-semibold text-pd-brand underline">
          Refund Policy
        </Link>
        .
      </p>
      <div className="flex flex-col gap-2">
        <label htmlFor="refund-reason" className={PD_LABEL}>
          Why do you want a refund? ({MIN} to {MAX} characters)
        </label>
        <textarea
          id="refund-reason"
          value={reason}
          maxLength={MAX}
          aria-invalid={err ? true : undefined}
          onChange={(e) => setReason(e.target.value)}
          className="min-h-24 w-full resize-y rounded-xl border border-pd-line2 p-3 text-sm outline-none focus:border-pd-brand focus:ring-4 focus:ring-pd-b100 aria-invalid:border-pd-red"
        />
        <span className="text-right text-xs text-pd-ink3">
          {reason.length}/{MAX}
        </span>
        {err && <span className={PD_ERR}>{err}</span>}
      </div>
    </PdDialog>
  );
}
