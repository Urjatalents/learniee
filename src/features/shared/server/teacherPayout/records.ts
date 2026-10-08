import { prisma } from "@/lib/prisma";
import {
    BankAccountStatus,
    LedgerPayoutStatus,
    PayoutRecordStatus
} from "@prisma/client";
import "server-only";
import { round2 } from '@/lib/money';

// ---------------------------------------------------------------------------
// Payout history — Teacher self-service (Earnings screen)
// ---------------------------------------------------------------------------

export interface TeacherPayoutRecordView {
  id: string;
  amount: number;
  cycleCount: number;
  status: PayoutRecordStatus;
  failureReason: string | null;
  razorpayPayoutId: string | null;
  createdAt: Date;
}
/**
 * A single Teacher's own payout history — one row per mass-pay batch
 * they were part of (paid or skipped), newest first. The
 * counterpart, Teacher-facing half of `listPaymentQueueGroupedByTeacher`
 * above: that lists everyone still queued; this lists what's already
 * been attempted for one teacher. Read-only — the Payment Queue
 * remains the only place a payout is actually triggered.
 */
export async function listPayoutRecordsForTeacher(teacherId: string): Promise<TeacherPayoutRecordView[]> {
  const rows = await prisma.payoutRecord.findMany({
    where: { teacherId },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((row) => ({
    id: row.id,
    amount: Number(row.amount),
    cycleCount: row.cycleCount,
    status: row.status,
    failureReason: row.failureReason,
    razorpayPayoutId: row.razorpayPayoutId,
    createdAt: row.createdAt,
  }));
}
// ---------------------------------------------------------------------------
// Payment Queue — Accounts' second tab, grouped by teacher
// ---------------------------------------------------------------------------

export interface PayoutQueueTeacherGroup {
  teacherId: string;
  teacherName: string;
  email: string;
  /** True only once the teacher's BankAccount is Admin-APPROVED — see BankAccountStatus. */
  hasBankAccount: boolean;
  /** NONE / PENDING / APPROVED / REJECTED — lets the UI explain *why* a teacher isn't payable. */
  bankAccountStatus: BankAccountStatus | "NONE";
  cycleCount: number;
  totalAmount: number;
  entryIds: string[];
}
export function teacherDisplayName(t: {
  firstName: string;
  lastName: string;
  visibleName: string | null;
}) {
  return t.visibleName?.trim() || `${t.firstName} ${t.lastName}`.trim();
}
/** Every QUEUED_FOR_PAYMENT cycle, grouped by teacher — the Payment tab's row list. */
export async function listPaymentQueueGroupedByTeacher(): Promise<PayoutQueueTeacherGroup[]> {
  const entries = await prisma.tuitionLedgerEntry.findMany({
    where: { payoutStatus: LedgerPayoutStatus.QUEUED_FOR_PAYMENT },
    include: {
      enrollment: {
        include: {
          teacher: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              visibleName: true,
              email: true,
              bankAccount: { select: { id: true, status: true } },
            },
          },
        },
      },
    },
    orderBy: { transactionDate: "asc" },
  });

  const groups = new Map<string, PayoutQueueTeacherGroup>();

  for (const entry of entries) {
    const teacher = entry.enrollment.teacher;
    const existing = groups.get(teacher.id);
    const amount = Number(entry.monthlyTeacherPay);

    if (existing) {
      existing.cycleCount += 1;
      existing.totalAmount = round2(existing.totalAmount + amount);
      existing.entryIds.push(entry.id);
    } else {
      groups.set(teacher.id, {
        teacherId: teacher.id,
        teacherName: teacherDisplayName(teacher),
        email: teacher.email,
        hasBankAccount: teacher.bankAccount?.status === BankAccountStatus.APPROVED,
        bankAccountStatus: teacher.bankAccount?.status ?? "NONE",
        cycleCount: 1,
        totalAmount: amount,
        entryIds: [entry.id],
      });
    }
  }

  return Array.from(groups.values()).sort((a, b) => b.totalAmount - a.totalAmount);
}
