import { logActivity } from "@/features/shared/server/activityLog.service";
import {
    notifyPayoutPaid
} from "@/features/shared/server/notificationTriggers.service";
import { prisma } from "@/lib/prisma";
import { initiateStubTeacherPayout } from "@/lib/teacherPayoutGateway";
import {
    BankAccountStatus,
    LedgerPayoutStatus,
    PayoutBatchStatus,
    PayoutRecordStatus,
    Prisma,
} from "@prisma/client";
import "server-only";
import { TeacherPayoutError } from './base';
import { round2 } from '@/lib/money';
import { listPaymentQueueGroupedByTeacher } from './records';

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
