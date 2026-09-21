"use client";

import { useCallback, useEffect, useState } from "react";

import { openRazorpayCheckout } from "@/lib/loadRazorpayCheckout";

export interface RenewalPreview {
  nextCycleNumber: number;
  scheduleDays: number[];
  scheduleTime: string;
  cycleStartKey: string;
  sessionCount: number;
  ratePerSession: number;
  totalAmount: number;
  isInternationalPayment: boolean;
  internationalSurchargeAmount: number;
  amountPayable: number;
}

export interface RenewalStatus {
  eligible: boolean;
  alreadyRenewed: boolean;
  opensOn: string;
  currentCycleNumber: number;
  currentCycleEndDate: string;
  currentScheduleDays: number[];
  currentScheduleTime: string | null;
  preview: RenewalPreview | null;
}

export function useRenewal(enrollmentId: string) {
  const [status, setStatus] = useState<RenewalStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const res = await fetch(`/api/parent/enrollments/${enrollmentId}/renew`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to load renewal status.");

      setStatus(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load renewal status.");
    } finally {
      setLoading(false);
    }
  }, [enrollmentId]);

  useEffect(() => {
    load();
  }, [load]);

  async function renew(overrides: { scheduleDays?: number[]; scheduleTime?: string }) {
    try {
      setPaying(true);
      setError("");

      const orderRes = await fetch(`/api/parent/enrollments/${enrollmentId}/renew/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(overrides),
      });
      const orderData = await orderRes.json();

      if (!orderRes.ok) {
        throw new Error(orderData.error || "Failed to start the renewal payment.");
      }

      const result = await openRazorpayCheckout({
        orderId: orderData.orderId,
        amount: orderData.amount,
        currency: orderData.currency,
        keyId: orderData.keyId,
        name: "Learnie",
        description: `Cycle ${orderData.pricing.nextCycleNumber} renewal`,
      });

      if (!result) {
        return { ok: false, message: "Payment cancelled — no charge was made." };
      }

      const verifyRes = await fetch(`/api/parent/enrollments/${enrollmentId}/renew/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpayOrderId: result.razorpay_order_id,
          razorpayPaymentId: result.razorpay_payment_id,
          razorpaySignature: result.razorpay_signature,
        }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        throw new Error(
          verifyData.error || "Payment succeeded but the renewal couldn't be confirmed.",
        );
      }

      await load();

      return { ok: true, message: "Renewed! Next cycle's classes are on your calendar." };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to renew.";
      setError(message);
      return { ok: false, message };
    } finally {
      setPaying(false);
    }
  }

  return { status, loading, paying, error, renew, reload: load };
}
