import { logActivity } from "@/features/shared/server/activityLog.service";
import {
    notifyPayoutPaid
} from "@/features/shared/server/notificationTriggers.service";
import { prisma } from "@/lib/prisma";
import { isRazorpayXEnabled } from "@/lib/razorpayX";
import { initiateStubTeacherPayout } from "@/lib/teacherPayoutGateway";
import { dispatchPayoutRecord, reconcileProcessingPayouts } from "./gateway";
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
  /** Money confirmed sent (always the case for the simulated mode). */
  paidTeacherIds: string[];
  /** RazorpayX accepted the payout; the bank result arrives by webhook. */
  processingTeacherIds: string[];
  /** Gateway rejected it — cycles are back in the queue. */
  failedTeacherIds: string[];
  /** No approved bank account. */
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

  const live = isRazorpayXEnabled();

  if (live) {
    // Settle anything a webhook missed before queueing new money.
    await reconcileProcessingPayouts().catch((error) =>
      console.error("Payout reconcile before mass-pay failed:", error),
    );
  } else if (process.env.NODE_ENV === "production") {
    console.warn("RAZORPAYX_ENABLED is not 'true' — mass-pay is SIMULATED, no money moves.");
  }

  const paidTeacherIds: string[] = [];
  const processingTeacherIds: string[] = [];
  const failedTeacherIds: string[] = [];
  let acceptedAmount = 0;

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
      skipped.push(group);
      continue;
    }

    try {
      const stub = live ? null : await initiateStubTeacherPayout({
        teacherId: group.teacherId,
        amountInRupees: group.totalAmount,
        bankAccount: {
          accountHolderName: bankAccount.accountHolderName,
          accountNumber: bankAccount.accountNumber,
          ifscCode: bankAccount.ifscCode,
        },
      });

      // Claim the queued cycles and create the record in ONE transaction.
      // The conditional update means a double-click or a second Accounts
      // user can never pay the same cycles twice.
      const record = await prisma.$transaction(async (tx) => {
        const claimed = await tx.tuitionLedgerEntry.updateMany({
          where: { id: { in: group.entryIds }, payoutStatus: LedgerPayoutStatus.QUEUED_FOR_PAYMENT },
          data: live
            ? { payoutStatus: LedgerPayoutStatus.PROCESSING }
            : { payoutStatus: LedgerPayoutStatus.PAID, paidAt: new Date() },
        });

        if (claimed.count !== group.entryIds.length) {
          throw new TeacherPayoutError("Queued cycles changed while paying — try again.", 409);
        }

        const created = await tx.payoutRecord.create({
          data: {
            payoutBatchId: batch.id,
            teacherId: group.teacherId,
            amount: group.totalAmount,
            cycleCount: group.cycleCount,
            status: live ? PayoutRecordStatus.PROCESSING : PayoutRecordStatus.SUCCESS,
            bankAccountSnapshot: {
              accountHolderName: bankAccount.accountHolderName,
              accountNumber: bankAccount.accountNumber,
              ifscCode: bankAccount.ifscCode,
              bankName: bankAccount.bankName,
            } as Prisma.InputJsonValue,
            razorpayPayoutId: stub?.razorpayPayoutId ?? null,
            processedAt: live ? null : new Date(),
          },
        });

        await tx.tuitionLedgerEntry.updateMany({
          where: { id: { in: group.entryIds } },
          data: { payoutRecordId: created.id },
        });

        return created;
      });

      if (!live) {
        paidTeacherIds.push(group.teacherId);
        acceptedAmount += group.totalAmount;
        await notifyPayoutPaid(group.teacherId, group.totalAmount, group.cycleCount);
        continue;
      }

      const outcome = await dispatchPayoutRecord(record.id);

      if (outcome === "FAILED") {
        failedTeacherIds.push(group.teacherId);
      } else if (outcome === "SETTLED") {
        paidTeacherIds.push(group.teacherId);
        acceptedAmount += group.totalAmount;
      } else {
        processingTeacherIds.push(group.teacherId);
        acceptedAmount += group.totalAmount;
      }
    } catch (error) {
      console.error(`Mass-pay failed for teacher ${group.teacherId}:`, error);
      failedTeacherIds.push(group.teacherId);
    }
  }

  const skippedTeacherIds = skipped.map((g) => g.teacherId);
  const notPaidCount = skippedTeacherIds.length + failedTeacherIds.length;
  const finalStatus = notPaidCount > 0 ? PayoutBatchStatus.PARTIALLY_COMPLETED : PayoutBatchStatus.COMPLETED;

  await prisma.payoutBatch.update({
    where: { id: batch.id },
    data: {
      totalAmount: round2(acceptedAmount),
      successCount: paidTeacherIds.length + processingTeacherIds.length,
      skippedCount: notPaidCount,
      status: finalStatus,
    },
  });

  await logActivity({
    action: "PAYOUT_MASS_PAID",
    actorRole: "ACCOUNTS",
    actorId: staffSub,
    description: `${live ? "Sent" : "Simulated"} payouts to ${paidTeacherIds.length + processingTeacherIds.length} teacher(s), ₹${round2(acceptedAmount).toLocaleString("en-IN")} total${
      processingTeacherIds.length ? ` (${processingTeacherIds.length} awaiting bank confirmation)` : ""
    }${skippedTeacherIds.length ? `; skipped ${skippedTeacherIds.length} (no approved bank account)` : ""}${
      failedTeacherIds.length ? `; ${failedTeacherIds.length} failed` : ""
    }.`,
    metadata: {
      batchId: batch.id,
      live,
      paidTeacherIds,
      processingTeacherIds,
      failedTeacherIds,
      skippedTeacherIds,
      totalAmount: round2(acceptedAmount),
    },
  });

  return {
    batchId: batch.id,
    status: finalStatus,
    paidTeacherIds,
    processingTeacherIds,
    failedTeacherIds,
    skippedTeacherIds,
    totalAmount: round2(acceptedAmount),
  };
}
