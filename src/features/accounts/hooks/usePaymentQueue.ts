"use client";

import { useEffect, useState } from "react";

export interface PayoutQueueTeacherGroup {
  teacherId: string;
  teacherName: string;
  email: string;
  /** True only once the teacher's bank account is Admin-approved. */
  hasBankAccount: boolean;
  /** "NONE" | "PENDING" | "APPROVED" | "REJECTED" — see Bank Account Approval, Sep 10, 2026. */
  bankAccountStatus: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
  cycleCount: number;
  totalAmount: number;
  entryIds: string[];
}

export interface MassPayResult {
  batchId: string;
  status: "COMPLETED" | "PARTIALLY_COMPLETED";
  paidTeacherIds: string[];
  processingTeacherIds: string[];
  failedTeacherIds: string[];
  skippedTeacherIds: string[];
  totalAmount: number;
}

/**
 * Payment Queue tab (Teacher Payouts, Sep 9, 2026) — every cycle
 * Accounts already Proceeded, grouped by teacher, with a mass-pay
 * action so several teachers can be paid in one click instead of
 * one-by-one. See `teacherPayout.service.ts`'s doc-comment: the
 * actual transfer is a STUB (RazorpayX Payouts not confirmed enabled
 * yet).
 */
export function usePaymentQueue() {
  const [groups, setGroups] = useState<PayoutQueueTeacherGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const [lastResult, setLastResult] = useState<MassPayResult | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const res = await fetch("/api/accounts/payout-queue");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load the payment queue");
      }

      setGroups(data.groups);
    } catch (err) {
      console.error(err);
      setError("Unable to load the payment queue.");
    } finally {
      setLoading(false);
    }
  }

  async function payTeachers(teacherIds: string[]) {
    try {
      setPaying(true);
      setError("");
      const res = await fetch("/api/accounts/payout-queue/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherIds }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to process the mass payout");
      }

      setLastResult(data);
      await load();
      return true;
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to process the mass payout.");
      return false;
    } finally {
      setPaying(false);
    }
  }

  return { groups, loading, error, paying, lastResult, payTeachers, reload: load };
}
