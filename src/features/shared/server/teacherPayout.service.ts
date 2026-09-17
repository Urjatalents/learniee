import "server-only";

import {
  Prisma,
  LedgerPayoutStatus,
  PayoutRecordStatus,
  PayoutBatchStatus,
  BankAccountStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { initiateStubTeacherPayout } from "@/lib/teacherPayoutGateway";
import { logActivity } from "@/features/shared/server/activityLog.service";
import {
  notifyPayoutPaid,
  notifyBankAccountSubmitted,
  notifyBankAccountReviewed,
} from "@/features/shared/server/notificationTriggers.service";

/**
 * Teacher Payouts — the Payment Queue / mass-pay half (Sep 9, 2026).
 * The Verify/Admin-review half lives in `tuitionLedger.service.ts`
 * (it only needs `TuitionLedgerEntry`); this file owns everything
 * that needs `BankAccount`/`PayoutBatch`/`PayoutRecord` instead.
 *
 * The actual money movement is a STUB — see
 * `src/lib/teacherPayoutGateway.ts`'s doc-comment for why (RazorpayX
 * Payouts isn't confirmed enabled yet) and what swapping it for a
 * real call looks like.
 */

export class TeacherPayoutError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Bank account — Teacher self-service
// ---------------------------------------------------------------------------

const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export interface UpsertBankAccountInput {
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName?: string;
  branchName?: string;
}

export async function getBankAccountForTeacher(teacherId: string) {
  return prisma.bankAccount.findUnique({ where: { teacherId } });
}

export async function upsertBankAccountForTeacher(
  teacherId: string,
  input: UpsertBankAccountInput,
) {
  const accountHolderName = input.accountHolderName?.trim();
  const accountNumber = input.accountNumber?.trim();
  const ifscCode = input.ifscCode?.trim().toUpperCase();

  if (!accountHolderName) {
    throw new TeacherPayoutError("Account holder name is required.");
  }

  if (!accountNumber || !/^\d{9,18}$/.test(accountNumber)) {
    throw new TeacherPayoutError("Enter a valid bank account number (9–18 digits).");
  }

  if (!ifscCode || !IFSC_PATTERN.test(ifscCode)) {
    throw new TeacherPayoutError("Enter a valid IFSC code (e.g. HDFC0001234).");
  }

  // Every save — first-time or an edit to already-APPROVED details —
  // resets status to PENDING and clears any prior review. This is
  // the actual approval gate: mass-pay only ever reads an APPROVED
  // row as payable (see below), so an edited-but-not-yet-reviewed
  // account simply can't be paid out from until Admin looks at it
  // again, without needing a separate "propose vs. live" pair of rows.
  const bankAccount = await prisma.bankAccount.upsert({
    where: { teacherId },
    create: {
      teacherId,
      accountHolderName,
      accountNumber,
      ifscCode,
      bankName: input.bankName?.trim() || null,
      branchName: input.branchName?.trim() || null,
      status: BankAccountStatus.PENDING,
    },
    update: {
      accountHolderName,
      accountNumber,
      ifscCode,
      bankName: input.bankName?.trim() || null,
      branchName: input.branchName?.trim() || null,
      status: BankAccountStatus.PENDING,
      reviewedByStaffSub: null,
      reviewedAt: null,
      rejectionReason: null,
    },
  });

  await notifyBankAccountSubmitted(teacherId);

  return bankAccount;
}

// ---------------------------------------------------------------------------
// Bank account — Admin approval
// ---------------------------------------------------------------------------

export interface AdminBankAccountRow {
  id: string;
  teacherId: string;
  teacherName: string;
  email: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string | null;
  branchName: string | null;
  status: BankAccountStatus;
  rejectionReason: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Every Teacher's bank account, newest-submitted first — Admin's approval queue. */
export async function listBankAccountsForAdmin(): Promise<AdminBankAccountRow[]> {
  const rows = await prisma.bankAccount.findMany({
    include: {
      teacher: {
        select: { firstName: true, lastName: true, visibleName: true, email: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return rows.map((row) => ({
    id: row.id,
    teacherId: row.teacherId,
    teacherName: teacherDisplayName(row.teacher),
    email: row.teacher.email,
    accountHolderName: row.accountHolderName,
    accountNumber: row.accountNumber,
    ifscCode: row.ifscCode,
    bankName: row.bankName,
    branchName: row.branchName,
    status: row.status,
    rejectionReason: row.rejectionReason,
    reviewedAt: row.reviewedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

/**
 * Admin's Approve/Reject decision on a submitted bank account.
 * Terminal either way — a Teacher who wants to fix a REJECTED
 * account just edits the form again, which re-submits it as a fresh
 * PENDING row via `upsertBankAccountForTeacher()` above.
 */
export async function reviewBankAccount(
  bankAccountId: string,
  decision: "APPROVE" | "REJECT",
  staffSub: string,
  rejectionReason?: string,
) {
  const existing = await prisma.bankAccount.findUnique({
    where: { id: bankAccountId },
    include: {
      teacher: { select: { firstName: true, lastName: true, visibleName: true, email: true } },
    },
  });

  if (!existing) {
    throw new TeacherPayoutError("Bank account not found.", 404);
  }

  if (existing.status !== BankAccountStatus.PENDING) {
    throw new TeacherPayoutError("This bank account has already been reviewed.", 409);
  }

  if (decision === "REJECT" && !rejectionReason?.trim()) {
    throw new TeacherPayoutError("A reason is required to reject bank details.");
  }

  const updated = await prisma.bankAccount.update({
    where: { id: bankAccountId },
    data: {
      status: decision === "APPROVE" ? BankAccountStatus.APPROVED : BankAccountStatus.REJECTED,
      reviewedByStaffSub: staffSub,
      reviewedAt: new Date(),
      rejectionReason: decision === "REJECT" ? rejectionReason!.trim() : null,
    },
  });

  await notifyBankAccountReviewed(
    existing.teacherId,
    decision === "APPROVE",
    updated.rejectionReason,
  );

  return {
    ...updated,
    teacherName: teacherDisplayName(existing.teacher),
  };
}

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

function teacherDisplayName(t: {
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

// ---------------------------------------------------------------------------
// Mass-pay
// ---------------------------------------------------------------------------

export interface MassPayResult {
  batchId: string;
  status: PayoutBatchStatus;
  paidTeacherIds: string[];
  skippedTeacherIds: string[];
  totalAmount: number;
}

/**
 * Pays every selected teacher's currently-queued cycles in one
 * batch. A teacher with no `BankAccount` on file is skipped (their
 * `TuitionLedgerEntry` rows stay QUEUED_FOR_PAYMENT for the next
 * batch, once they add one) rather than failing the whole action —
 * that's the point of "mass pay everyone else without blocking on
 * one missing bank account."
 *
 * Each teacher's own PayoutRecord + ledger-entry updates are one
 * transaction; the batch summary row is written after every teacher
 * has been processed, so its counts are always accurate even if
 * something in the middle throws (caught per-teacher, not aborting
 * the whole batch).
 */
export async function massPayTeachers(
  teacherIds: string[],
  staffSub: string,
): Promise<MassPayResult> {
  const uniqueTeacherIds = Array.from(new Set(teacherIds));

  if (uniqueTeacherIds.length === 0) {
    throw new TeacherPayoutError("Select at least one teacher to pay.");
  }

  const groups = await listPaymentQueueGroupedByTeacher();
  const selected = groups.filter((g) => uniqueTeacherIds.includes(g.teacherId));

  if (selected.length === 0) {
    throw new TeacherPayoutError("None of the selected teachers currently have a queued payout.");
  }

  // `hasBankAccount` already comes back from the grouped query above,
  // so who's payable vs. skipped is known up front — the PayoutBatch
  // row can be created once, with its final counts, instead of a
  // placeholder-then-patch approach (which would also violate the FK
  // constraint on PayoutRecord.payoutBatchId).
  const payable = selected.filter((g) => g.hasBankAccount);
  const skipped = selected.filter((g) => !g.hasBankAccount);
  const totalAmount = round2(payable.reduce((s, g) => s + g.totalAmount, 0));

  const batch = await prisma.payoutBatch.create({
    data: {
      initiatedByStaffSub: staffSub,
      totalAmount,
      teacherCount: selected.length,
      successCount: payable.length,
      skippedCount: skipped.length,
      status: skipped.length > 0 ? PayoutBatchStatus.PARTIALLY_COMPLETED : PayoutBatchStatus.COMPLETED,
    },
  });

  for (const group of skipped) {
    // Recorded as a SKIPPED PayoutRecord (audit trail of "we tried,
    // not payable yet") but never touches the ledger entries — they
    // stay QUEUED_FOR_PAYMENT for the next batch. The reason
    // distinguishes "never filled in" from "filled in but Admin
    // hasn't approved it yet" from "Admin rejected it" — all three
    // are equally un-payable, but for different reasons worth
    // surfacing to Accounts.
    const failureReason =
      group.bankAccountStatus === "PENDING"
        ? "Bank account submitted but not yet approved by Admin."
        : group.bankAccountStatus === "REJECTED"
          ? "Bank account was rejected by Admin — awaiting a resubmission."
          : "No bank account on file for this teacher.";

    await prisma.payoutRecord.create({
      data: {
        payoutBatchId: batch.id,
        teacherId: group.teacherId,
        amount: group.totalAmount,
        cycleCount: group.cycleCount,
        status: PayoutRecordStatus.SKIPPED_NO_BANK_ACCOUNT,
        failureReason,
      },
    });
  }

  const paidTeacherIds: string[] = [];

  for (const group of payable) {
    const bankAccount = await prisma.bankAccount.findUnique({ where: { teacherId: group.teacherId } });

    // Defensive — hasBankAccount came from the same query moments
    // ago, but re-check rather than assume nothing changed (the
    // teacher could have edited their details, resetting status back
    // to PENDING, in the gap between listing and this loop running).
    if (!bankAccount || bankAccount.status !== BankAccountStatus.APPROVED) {
      await prisma.payoutRecord.create({
        data: {
          payoutBatchId: batch.id,
          teacherId: group.teacherId,
          amount: group.totalAmount,
          cycleCount: group.cycleCount,
          status: PayoutRecordStatus.SKIPPED_NO_BANK_ACCOUNT,
          failureReason: bankAccount
            ? "Bank account was edited (back to PENDING) between listing and payout."
            : "Bank account was removed between listing and payout.",
        },
      });
      continue;
    }

    const gatewayResult = await initiateStubTeacherPayout({
      teacherId: group.teacherId,
      amountInRupees: group.totalAmount,
      bankAccount: {
        accountHolderName: bankAccount.accountHolderName,
        accountNumber: bankAccount.accountNumber,
        ifscCode: bankAccount.ifscCode,
      },
    });

    await prisma.$transaction(async (tx) => {
      const record = await tx.payoutRecord.create({
        data: {
          payoutBatchId: batch.id,
          teacherId: group.teacherId,
          amount: group.totalAmount,
          cycleCount: group.cycleCount,
          status: PayoutRecordStatus.SUCCESS,
          bankAccountSnapshot: {
            accountHolderName: bankAccount.accountHolderName,
            accountNumber: bankAccount.accountNumber,
            ifscCode: bankAccount.ifscCode,
            bankName: bankAccount.bankName,
          } as Prisma.InputJsonValue,
          razorpayPayoutId: gatewayResult.razorpayPayoutId,
        },
      });

      await tx.tuitionLedgerEntry.updateMany({
        where: { id: { in: group.entryIds } },
        data: {
          payoutStatus: LedgerPayoutStatus.PAID,
          payoutRecordId: record.id,
          paidAt: new Date(),
        },
      });
    });

    paidTeacherIds.push(group.teacherId);

    await notifyPayoutPaid(group.teacherId, group.totalAmount, group.cycleCount);
  }

  const skippedTeacherIds = skipped.map((g) => g.teacherId);

  await logActivity({
    action: "PAYOUT_MASS_PAID",
    actorRole: "ACCOUNTS",
    actorId: staffSub,
    description: `Paid ${paidTeacherIds.length} teacher(s) ₹${totalAmount.toLocaleString("en-IN")} total${
      skippedTeacherIds.length ? `; skipped ${skippedTeacherIds.length} (no bank account)` : ""
    }.`,
    metadata: { batchId: batch.id, paidTeacherIds, skippedTeacherIds, totalAmount },
  });

  return {
    batchId: batch.id,
    status: batch.status,
    paidTeacherIds,
    skippedTeacherIds,
    totalAmount,
  };
}
