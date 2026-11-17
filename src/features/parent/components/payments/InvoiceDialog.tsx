"use client";

import Link from "next/link";
import { Download } from "lucide-react";

import PdDialog from "@/features/parent/components/courses/PdDialog";
import { PD_BTN_PRI } from "@/features/parent/components/courses/pdUi";
import type { InvoiceView } from "@/features/parent/hooks/useInvoices";
import { INVOICE_TYPE_LABEL, PdKv, dLong, inr2 } from "@/features/parent/components/payments/paymentsUi";

/** Design `invoiceDialog`: the summary; "Download PDF" opens the printable invoice with the print dialog. */
export default function InvoiceDialog({
  invoice,
  refundTag,
  onClose,
}: {
  invoice: InvoiceView;
  refundTag: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <PdDialog
      title={invoice.invoiceNumber}
      onClose={onClose}
      footer={
        <Link href={`/parent/payments/${invoice.id}?print=1`} className={`${PD_BTN_PRI} w-full sm:w-auto`}>
          <Download size={16} />
          Download PDF
        </Link>
      }
    >
      <PdKv
        rows={[
          ["Date", dLong(invoice.issuedAt)],
          ["Type", INVOICE_TYPE_LABEL[invoice.type] ?? invoice.type],
          ["Description", invoice.description],
          ["Amount", inr2(invoice.amount)],
        ]}
      />
      {refundTag}
      <Link
        href={`/parent/payments/${invoice.id}`}
        className="text-[13px] font-semibold text-pd-brand underline"
      >
        Open full invoice
      </Link>
    </PdDialog>
  );
}
