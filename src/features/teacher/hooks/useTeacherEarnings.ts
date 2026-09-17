"use client";

import { useEffect, useState } from "react";

export type LedgerPayoutStatusView =
  | "PENDING_VERIFICATION"
  | "ON_HOLD"
  | "QUEUED_FOR_PAYMENT"
  | "PAID"
  | "REJECTED"
  | "EXPIRED"
  | "APPROVED"; // legacy-only, see schema.prisma's LedgerPayoutStatus doc-comment

export interface TeacherEarningsLedgerEntry {
  id: string;
  enrollmentId: string;
  cycleNumber: number;
  transactionDate: string;
  childName: string;
  subject: string;
  monthlyTeacherPay: number;
  payoutStatus: LedgerPayoutStatusView;
  isOverdue: boolean;
  holdReason: string | null;
  rejectionReason: string | null;
  paidAt: string | null;
}

export type PayoutRecordStatusView = "SUCCESS" | "SKIPPED_NO_BANK_ACCOUNT" | "FAILED";

export interface TeacherPayoutRecord {
  id: string;
  amount: number;
  cycleCount: number;
  status: PayoutRecordStatusView;
  failureReason: string | null;
  createdAt: string;
}

export type BankAccountApprovalStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED";

/**
 * Teacher-facing Earnings screen (Teacher Payouts follow-up) —
 * previously the one gap flagged repeatedly: the Tuition Ledger and
 * mass-pay history existed, but only on the Accounts/Parent-Wallet
 * side, with no Teacher view of their own money. Read-only — the
 * Accounts Verify tab / Payment Queue remain the only places a cycle
 * actually gets acted on.
 */
export function useTeacherEarnings() {
  const [ledgerEntries, setLedgerEntries] = useState<TeacherEarningsLedgerEntry[]>([]);
  const [payoutRecords, setPayoutRecords] = useState<TeacherPayoutRecord[]>([]);
  const [bankAccountStatus, setBankAccountStatus] = useState<BankAccountApprovalStatus>("NONE");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/teacher/earnings");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load earnings");
      }

      setLedgerEntries(data.ledgerEntries ?? []);
      setPayoutRecords(data.payoutRecords ?? []);
      setBankAccountStatus(data.bankAccountStatus ?? "NONE");
    } catch (err) {
      console.error(err);
      setError("Unable to load your earnings right now.");
    } finally {
      setLoading(false);
    }
  }

  return { ledgerEntries, payoutRecords, bankAccountStatus, loading, error, reload: load };
}
