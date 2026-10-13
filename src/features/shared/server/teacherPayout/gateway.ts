import crypto from "crypto";
import { logActivity } from "@/features/shared/server/activityLog.service";
import { notifyAllAdmins } from "@/features/shared/server/notification.service";
import { notifyPayoutPaid } from "@/features/shared/server/notificationTriggers.service";
import { prisma } from "@/lib/prisma";
import {
    createContact,
    createFundAccount,
    createPayout,
    describePayoutFailure,
    fetchPayout,
    RazorpayXError,
    type RazorpayXPayoutEntity,
} from "@/lib/razorpayX";
import {
    BankAccountStatus,
    LedgerPayoutStatus,
    NotificationType,
    PayoutRecordStatus,
} from "@prisma/client";
import "server-only";

/**
 * RazorpayX payout lifecycle (Oct 13, 2026).
 *
 *   mass-pay claims cycles  -> PayoutRecord PROCESSING, ledger PROCESSING
 *   dispatchPayoutRecord()  -> Fund Account (cached) + payout API call
 *   webhook / reconcile     -> applyGatewayPayout():
 *        processed          -> record SUCCESS, ledger PAID, teacher notified
 *        failed/reversed/…  -> record FAILED, ledger back to QUEUED_FOR_PAYMENT
 *
 * Every transition is a conditional update on `status = PROCESSING`, so the
 * webhook, the reconcile sweep and a retry can all arrive in any order and
 * the money side effects still happen exactly once.
 */

export type DispatchOutcome = "SETTLED" | "SUBMITTED" | "FAILED" | "UNKNOWN";

const FAILED_GATEWAY_STATUSES = new Set(["failed", "rejected", "reversed", "cancelled"]);
const RECONCILE_AFTER_MS = 10 * 60 * 1000;
const RECONCILE_BATCH = 20;

function fundAccountKeyOf(b: { accountHolderName: string; accountNumber: string; ifscCode: string }) {
  return crypto
    .createHash("sha256")
    .update(`${b.accountHolderName}|${b.accountNumber}|${b.ifscCode}`)
    .digest("hex");
}

async function ensureFundAccount(teacherId: string): Promise<string> {
  const bank = await prisma.bankAccount.findUnique({
    where: { teacherId },
    include: { teacher: { select: { firstName: true, lastName: true, visibleName: true, email: true, phone: true } } },
  });

  if (!bank || bank.status !== BankAccountStatus.APPROVED) {
    throw new RazorpayXError("Bank account is not approved.", null, true);
  }

  const key = fundAccountKeyOf(bank);

  if (bank.razorpayFundAccountId && bank.fundAccountKey === key) {
    return bank.razorpayFundAccountId;
  }

  let contactId = bank.razorpayContactId;

  if (!contactId) {
    const t = bank.teacher;
    const contact = await createContact({
      name: t.visibleName?.trim() || `${t.firstName} ${t.lastName}`.trim(),
      email: t.email,
      phone: t.phone,
      referenceId: teacherId,
    });

    contactId = contact.id;
  }

  const fundAccount = await createFundAccount({
    contactId,
    accountHolderName: bank.accountHolderName,
    ifscCode: bank.ifscCode,
    accountNumber: bank.accountNumber,
  });

  await prisma.bankAccount.update({
    where: { id: bank.id },
    data: { razorpayContactId: contactId, razorpayFundAccountId: fundAccount.id, fundAccountKey: key },
  });

  return fundAccount.id;
}

// ---------------------------------------------------------------------------
// Final states
// ---------------------------------------------------------------------------

async function settlePayoutRecord(recordId: string, entity: RazorpayXPayoutEntity): Promise<boolean> {
  const settled = await prisma.$transaction(async (tx) => {
    const moved = await tx.payoutRecord.updateMany({
      where: { id: recordId, status: PayoutRecordStatus.PROCESSING },
      data: {
        status: PayoutRecordStatus.SUCCESS,
        razorpayPayoutId: entity.id,
        gatewayStatus: entity.status,
        utr: entity.utr ?? null,
        processedAt: new Date(),
        failureReason: null,
      },
    });

    if (moved.count === 0) {
      return false;
    }

    await tx.tuitionLedgerEntry.updateMany({
      where: { payoutRecordId: recordId, payoutStatus: LedgerPayoutStatus.PROCESSING },
      data: { payoutStatus: LedgerPayoutStatus.PAID, paidAt: new Date() },
    });

    return true;
  });

  if (settled) {
    const record = await prisma.payoutRecord.findUnique({ where: { id: recordId } });

    if (record) {
      await notifyPayoutPaid(record.teacherId, Number(record.amount), record.cycleCount);
      await logActivity({
        action: "PAYOUT_MASS_PAID",
        actorRole: "SYSTEM",
        description: `RazorpayX payout ${entity.id} settled — ₹${Number(record.amount).toLocaleString("en-IN")}.`,
        metadata: { payoutRecordId: recordId, razorpayPayoutId: entity.id, utr: entity.utr ?? null },
      });
    }
  }

  return settled;
}

/** Marks the record FAILED and puts its cycles back in the Payment Queue. */
export async function failPayoutRecord(
  recordId: string,
  reason: string,
  gateway?: { payoutId?: string; status?: string },
): Promise<boolean> {
  const failed = await prisma.$transaction(async (tx) => {
    const moved = await tx.payoutRecord.updateMany({
      where: { id: recordId, status: PayoutRecordStatus.PROCESSING },
      data: {
        status: PayoutRecordStatus.FAILED,
        failureReason: reason,
        gatewayStatus: gateway?.status ?? null,
        ...(gateway?.payoutId ? { razorpayPayoutId: gateway.payoutId } : {}),
        processedAt: new Date(),
      },
    });

    if (moved.count === 0) {
      return false;
    }

    await tx.tuitionLedgerEntry.updateMany({
      where: { payoutRecordId: recordId, payoutStatus: LedgerPayoutStatus.PROCESSING },
      data: { payoutStatus: LedgerPayoutStatus.QUEUED_FOR_PAYMENT, payoutRecordId: null, paidAt: null },
    });

    return true;
  });

  if (failed) {
    const record = await prisma.payoutRecord.findUnique({ where: { id: recordId } });
    const amount = record ? Number(record.amount) : 0;

    await logActivity({
      action: "PAYOUT_FAILED",
      actorRole: "SYSTEM",
      description: `RazorpayX payout failed (₹${amount.toLocaleString("en-IN")}): ${reason}`,
      metadata: { payoutRecordId: recordId, teacherId: record?.teacherId, reason },
    });

    try {
      await notifyAllAdmins({
        type: NotificationType.GENERIC,
        title: "A teacher payout failed",
        message: `₹${amount.toLocaleString("en-IN")} payout failed — ${reason} The cycles are back in the Payment Queue.`,
        link: "/admin/accounts",
      });
    } catch (error) {
      console.error("Payout failure notification failed:", error);
    }
  }

  return failed;
}

/** Applies a RazorpayX payout entity (from a webhook or a fetch) to its record. */
export async function applyGatewayPayout(entity: RazorpayXPayoutEntity): Promise<"SETTLED" | "FAILED" | "PENDING" | "UNKNOWN_RECORD"> {
  const record = await prisma.payoutRecord.findFirst({
    where: {
      OR: [
        { razorpayPayoutId: entity.id },
        ...(entity.reference_id ? [{ id: entity.reference_id }] : []),
      ],
    },
    select: { id: true, status: true },
  });

  if (!record) {
    return "UNKNOWN_RECORD";
  }

  const status = entity.status.toLowerCase();

  if (status === "processed") {
    await settlePayoutRecord(record.id, entity);
    return "SETTLED";
  }

  if (FAILED_GATEWAY_STATUSES.has(status)) {
    await failPayoutRecord(record.id, describePayoutFailure(entity), {
      payoutId: entity.id,
      status,
    });
    return "FAILED";
  }

  // queued / pending / processing — remember the gateway status only.
  if (record.status === PayoutRecordStatus.PROCESSING) {
    await prisma.payoutRecord.updateMany({
      where: { id: record.id, status: PayoutRecordStatus.PROCESSING },
      data: { razorpayPayoutId: entity.id, gatewayStatus: status },
    });
  }

  return "PENDING";
}

// ---------------------------------------------------------------------------
// Dispatch + reconcile
// ---------------------------------------------------------------------------

/**
 * Sends one PROCESSING PayoutRecord to RazorpayX. Safe to call again for the
 * same record: the record id is the idempotency key, so Razorpay never creates
 * a second payout.
 */
export async function dispatchPayoutRecord(recordId: string): Promise<DispatchOutcome> {
  const record = await prisma.payoutRecord.findUnique({ where: { id: recordId } });

  if (!record || record.status !== PayoutRecordStatus.PROCESSING) {
    return "FAILED";
  }

  try {
    const fundAccountId = await ensureFundAccount(record.teacherId);
    const entity = await createPayout({
      fundAccountId,
      amountInRupees: Number(record.amount),
      referenceId: record.id,
      idempotencyKey: record.id,
      notes: { payoutRecordId: record.id, teacherId: record.teacherId },
    });

    const result = await applyGatewayPayout(entity);

    if (result === "SETTLED") return "SETTLED";
    if (result === "FAILED") return "FAILED";

    return "SUBMITTED";
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown gateway error.";

    if (error instanceof RazorpayXError && error.definitive) {
      await failPayoutRecord(recordId, message);
      return "FAILED";
    }

    if (!(error instanceof RazorpayXError)) {
      // Config error (missing env var etc.) — nothing was sent.
      await failPayoutRecord(recordId, message);
      return "FAILED";
    }

    // Ambiguous (timeout / 5xx / 429): the payout may exist. Keep PROCESSING;
    // the reconcile sweep retries with the same idempotency key.
    console.error(`RazorpayX payout ${recordId} outcome unknown:`, error);
    await prisma.payoutRecord.updateMany({
      where: { id: recordId, status: PayoutRecordStatus.PROCESSING },
      data: { failureReason: `Gateway response unknown — will retry. (${message})` },
    });

    return "UNKNOWN";
  }
}

/**
 * Settles PROCESSING records that no webhook has resolved: asks RazorpayX for
 * the status when we have a payout id, otherwise re-dispatches (idempotent).
 */
export async function reconcileProcessingPayouts(): Promise<{ checked: number }> {
  const stale = await prisma.payoutRecord.findMany({
    where: {
      status: PayoutRecordStatus.PROCESSING,
      createdAt: { lt: new Date(Date.now() - RECONCILE_AFTER_MS) },
    },
    orderBy: { createdAt: "asc" },
    take: RECONCILE_BATCH,
    select: { id: true, razorpayPayoutId: true },
  });

  for (const record of stale) {
    try {
      if (record.razorpayPayoutId) {
        await applyGatewayPayout(await fetchPayout(record.razorpayPayoutId));
      } else {
        await dispatchPayoutRecord(record.id);
      }
    } catch (error) {
      console.error(`Payout reconcile failed for ${record.id}:`, error);
    }
  }

  return { checked: stale.length };
}
