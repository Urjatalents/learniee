import {
    notifyBankAccountReviewed,
    notifyBankAccountSubmitted
} from "@/features/shared/server/notificationTriggers.service";
import { prisma } from "@/lib/prisma";
import {
    BankAccountStatus
} from "@prisma/client";
import "server-only";
import { IFSC_PATTERN, TeacherPayoutError } from './base';
import { teacherDisplayName } from './records';

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
