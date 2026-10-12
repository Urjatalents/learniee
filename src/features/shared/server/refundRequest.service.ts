import {
  notifyRefundRequestDecided,
  notifyRefundRequestSubmitted,
} from "@/features/shared/server/notificationTriggers.service";
import { creditWalletInTx } from "@/features/shared/server/wallet.service";
import { prisma } from "@/lib/prisma";
import {
  InvoicePayerRole,
  InvoiceType,
  Prisma,
  RefundRequestStatus,
} from "@prisma/client";
import "server-only";

/**
 * Refund requests (Oct 12, 2026).
 *
 * Policy: nothing is refunded until Admin approves it. A Parent raises a
 * request against one paid Invoice (button on the Payments page); Admin
 * approves — typing the refund amount himself, the system calculates nothing —
 * or rejects. An approval credits the Parent's WALLET in the same transaction
 * that marks the request APPROVED, so a request can never be approved without
 * the credit or credited twice.
 *
 * Not done here: approving does not cancel the Enrollment or touch its
 * sessions or payout ledger row.
 */

export class RefundRequestError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const MIN_REASON = 10;
const MAX_REASON = 1000;
const MAX_NOTE = 500;
const MIN_REJECT_NOTE = 5;
/** Stops one account flooding the Admin queue. */
const MAX_PENDING_PER_PARENT = 5;

function money(value: Prisma.Decimal | number | null | undefined): number {
  return value == null ? 0 : Number(value);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

async function approvedTotal(tx: Prisma.TransactionClient, invoiceId: string, excludeId?: string) {
  const agg = await tx.refundRequest.aggregate({
    where: {
      invoiceId,
      status: RefundRequestStatus.APPROVED,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    _sum: { approvedAmount: true },
  });

  return money(agg._sum.approvedAmount);
}

/* ------------------------------------------------------------------ */
/* Parent                                                              */
/* ------------------------------------------------------------------ */

/** This Parent's refund requests, newest first (the Payments page matches them to invoices by `invoiceId`). */
export async function listRefundRequestsForParent(parentId: string) {
  const rows = await prisma.refundRequest.findMany({
    where: { parentId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      invoiceId: true,
      status: true,
      reason: true,
      approvedAmount: true,
      adminNote: true,
      decidedAt: true,
      createdAt: true,
    },
  });

  return rows.map((r) => ({ ...r, approvedAmount: r.approvedAmount == null ? null : money(r.approvedAmount) }));
}

export interface CreateRefundRequestInput {
  invoiceId?: unknown;
  reason?: unknown;
}

export async function createRefundRequest(parentId: string, input: CreateRefundRequestInput) {
  const invoiceId = typeof input.invoiceId === "string" ? input.invoiceId : "";
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";

  if (!invoiceId) throw new RefundRequestError("Please choose the payment.");

  if (reason.length < MIN_REASON || reason.length > MAX_REASON) {
    throw new RefundRequestError(
      `Please explain in ${MIN_REASON} to ${MAX_REASON} characters why you want a refund.`,
    );
  }

  // The invoice must be this parent's own — never trust a client-sent id.
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, payerId: parentId, payerRole: InvoicePayerRole.PARENT },
    select: { id: true, amount: true, description: true, type: true },
  });

  if (!invoice) throw new RefundRequestError("That payment was not found.", 404);

  if (invoice.type === InvoiceType.WALLET_TOPUP) {
    throw new RefundRequestError("Wallet top-ups can't be refunded.");
  }

  const parent = await prisma.parentProfile.findUnique({
    where: { id: parentId },
    select: { firstName: true, lastName: true },
  });

  if (!parent) throw new RefundRequestError("Parent not found.", 404);

  const created = await prisma.$transaction(async (tx) => {
    const pendingForInvoice = await tx.refundRequest.count({
      where: { invoiceId, status: RefundRequestStatus.PENDING },
    });

    if (pendingForInvoice > 0) {
      throw new RefundRequestError("You already have a refund request waiting for this payment.", 409);
    }

    const pendingTotal = await tx.refundRequest.count({
      where: { parentId, status: RefundRequestStatus.PENDING },
    });

    if (pendingTotal >= MAX_PENDING_PER_PARENT) {
      throw new RefundRequestError(
        `You already have ${MAX_PENDING_PER_PARENT} refund requests waiting. Please wait for a response first.`,
        429,
      );
    }

    if (money(invoice.amount) - (await approvedTotal(tx, invoiceId)) <= 0) {
      throw new RefundRequestError("This payment has already been fully refunded.", 409);
    }

    return tx.refundRequest.create({
      data: { parentId, invoiceId, reason, amountPaid: invoice.amount },
    });
  });

  await notifyRefundRequestSubmitted({
    parentName: `${parent.firstName} ${parent.lastName ?? ""}`.trim(),
    description: invoice.description,
  });

  return { id: created.id, status: created.status };
}

/** Parent withdraws a request that Admin has not decided yet. */
export async function cancelRefundRequest(parentId: string, requestId: string) {
  const result = await prisma.refundRequest.updateMany({
    where: { id: requestId, parentId, status: RefundRequestStatus.PENDING },
    data: { status: RefundRequestStatus.CANCELLED },
  });

  if (result.count === 0) {
    throw new RefundRequestError("This request can no longer be cancelled.", 409);
  }
}

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

export async function listRefundRequestsForAdmin() {
  const rows = await prisma.refundRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      parent: { select: { firstName: true, lastName: true, email: true } },
      invoice: { select: { invoiceNumber: true, description: true, type: true, issuedAt: true } },
    },
  });

  const pendingInvoiceIds = [...new Set(rows.filter((r) => r.status === "PENDING").map((r) => r.invoiceId))];

  const approved = pendingInvoiceIds.length
    ? await prisma.refundRequest.groupBy({
        by: ["invoiceId"],
        where: { invoiceId: { in: pendingInvoiceIds }, status: RefundRequestStatus.APPROVED },
        _sum: { approvedAmount: true },
      })
    : [];

  const refundedByInvoice = new Map(approved.map((a) => [a.invoiceId, money(a._sum.approvedAmount)]));

  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    reason: r.reason,
    parentName: `${r.parent.firstName} ${r.parent.lastName ?? ""}`.trim(),
    parentEmail: r.parent.email,
    invoiceNumber: r.invoice.invoiceNumber,
    description: r.invoice.description,
    invoiceType: r.invoice.type,
    paidAt: r.invoice.issuedAt,
    amountPaid: money(r.amountPaid),
    /** What Admin can still refund for this payment (paid minus refunds already approved). */
    remainingRefundable: Math.max(0, round2(money(r.amountPaid) - (refundedByInvoice.get(r.invoiceId) ?? 0))),
    approvedAmount: r.approvedAmount == null ? null : money(r.approvedAmount),
    adminNote: r.adminNote,
    decidedByName: r.decidedByName,
    decidedAt: r.decidedAt,
    createdAt: r.createdAt,
  }));
}

export interface DecideRefundInput {
  requestId: string;
  action: "APPROVE" | "REJECT";
  /** APPROVE only — required; Admin types it, nothing is suggested. */
  approvedAmount?: unknown;
  adminNote?: unknown;
  admin: { sub: string; name?: string | null };
}

/**
 * Admin's decision. APPROVE marks the request APPROVED and credits the
 * Parent's Wallet in ONE transaction; the conditional update on
 * `status = PENDING` means two Admins clicking at once can only ever credit
 * once. The invoice row is locked first so two requests for the same payment
 * cannot together refund more than was paid.
 */
export async function decideRefundRequest(input: DecideRefundInput) {
  const adminNote = typeof input.adminNote === "string" ? input.adminNote.trim() : "";

  if (adminNote.length > MAX_NOTE) {
    throw new RefundRequestError(`Note must be ${MAX_NOTE} characters or fewer.`);
  }

  if (input.action === "REJECT") {
    if (adminNote.length < MIN_REJECT_NOTE) {
      throw new RefundRequestError("Please give the parent a reason for rejecting (at least 5 characters).");
    }

    const request = await prisma.refundRequest.findUnique({
      where: { id: input.requestId },
      select: { parentId: true },
    });

    if (!request) throw new RefundRequestError("Refund request not found.", 404);

    const result = await prisma.refundRequest.updateMany({
      where: { id: input.requestId, status: RefundRequestStatus.PENDING },
      data: {
        status: RefundRequestStatus.REJECTED,
        adminNote,
        decidedBySub: input.admin.sub,
        decidedByName: input.admin.name ?? null,
        decidedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new RefundRequestError("This request was already decided or withdrawn.", 409);
    }

    await notifyRefundRequestDecided({ parentId: request.parentId, outcome: "REJECTED", adminNote });

    return { status: RefundRequestStatus.REJECTED, amount: 0 };
  }

  const amount = round2(Number(input.approvedAmount));

  if (input.approvedAmount == null || input.approvedAmount === "" || !Number.isFinite(amount) || amount <= 0) {
    throw new RefundRequestError("Enter the amount to refund (more than ₹0).");
  }

  const outcome = await prisma.$transaction(async (tx) => {
    const request = await tx.refundRequest.findUnique({
      where: { id: input.requestId },
      include: { invoice: { select: { description: true } } },
    });

    if (!request) throw new RefundRequestError("Refund request not found.", 404);

    if (request.status !== RefundRequestStatus.PENDING) {
      throw new RefundRequestError("This request was already decided or withdrawn.", 409);
    }

    // Serialise refunds for one payment so the cap below can't be raced.
    await tx.$queryRaw`SELECT "id" FROM "Invoice" WHERE "id" = ${request.invoiceId} FOR UPDATE`;

    const max = round2(money(request.amountPaid) - (await approvedTotal(tx, request.invoiceId, request.id)));

    if (amount > max) {
      throw new RefundRequestError(
        `You can refund at most ₹${max.toLocaleString("en-IN")} for this payment (paid minus refunds already approved).`,
      );
    }

    const claimed = await tx.refundRequest.updateMany({
      where: { id: request.id, status: RefundRequestStatus.PENDING },
      data: {
        status: RefundRequestStatus.APPROVED,
        approvedAmount: amount,
        adminNote: adminNote || null,
        decidedBySub: input.admin.sub,
        decidedByName: input.admin.name ?? null,
        decidedAt: new Date(),
      },
    });

    if (claimed.count === 0) {
      throw new RefundRequestError("This request was already decided or withdrawn.", 409);
    }

    const { transaction } = await creditWalletInTx(tx, {
      parentId: request.parentId,
      amount,
      reason: `Refund approved — ${request.invoice.description}`,
      referenceType: "REFUND_REQUEST",
      referenceId: request.id,
      createdByStaffSub: input.admin.sub,
    });

    await tx.refundRequest.update({
      where: { id: request.id },
      data: { walletTransactionId: transaction.id },
    });

    return { parentId: request.parentId };
  });

  await notifyRefundRequestDecided({
    parentId: outcome.parentId,
    outcome: "APPROVED",
    amount,
    adminNote: adminNote || null,
  });

  return { status: RefundRequestStatus.APPROVED, amount };
}
