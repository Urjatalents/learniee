"use client";

import { useEffect, useState } from "react";
import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";
import { isBackgroundRefresh } from "@/lib/refreshBus";

export type InvoiceType =
  | "ENROLLMENT_PAYMENT"
  | "DEMO_BOOKING_PAYMENT"
  | "WALLET_TOPUP"
  | "DEMO_COUPON_PURCHASE"
  | "CYCLE_RENEWAL_PAYMENT";

export interface InvoiceView {
  id: string;
  invoiceNumber: string;
  type: InvoiceType;
  amount: number;
  currency: string;
  description: string;
  referenceType: string;
  referenceId: string;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  issuedAt: string;
  createdAt: string;
  /** Only present on the single-invoice detail view (`GET /api/parent/invoices/[invoiceId]`), not the list. */
  billTo?: {
    name: string;
    email: string;
    phone: string;
    addressLines: string[];
  };
}

/** Backs `/parent/payments` — the logged-in parent's own invoices. */
export function useInvoices() {
  const [invoices, setInvoices] = useState<InvoiceView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  useAutoRefresh(() => load(), { paths: ["/api/parent/invoices"] });

  async function load() {
    try {
      if (!isBackgroundRefresh()) setLoading(true);
      const res = await fetch("/api/parent/invoices");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch your invoices");
      }

      setInvoices(data.invoices);
    } catch (err) {
      console.error(err);
      setError("Unable to load your invoices.");
    } finally {
      setLoading(false);
    }
  }

  return { invoices, loading, error, reload: load };
}
