import { generateInvoiceForPayment } from "@/features/shared/server/invoice.service";
import { notifyWalletCredited } from "@/features/shared/server/notificationTriggers.service";
import { prisma } from "@/lib/prisma";
import { InvoiceType, WalletTransactionType } from "@prisma/client";

/**
 * Wallet (06-OPEN-DECISIONS.md #28) — closed-loop credit ledger per
 * ParentProfile, no cash-out (money only ever leaves via future
 * spend, never a payout/withdrawal). Lazily created on first use,
 * same pattern as `DemoCoupon` (see `demoCoupon.service.ts`'s
 * `getOrCreateDemoCoupon()`) — no backfill migration needed for
 * ParentProfile rows that existed before this feature.
 *
 * Two ways money enters a Wallet:
 *  1. Accounts/Admin manually crediting via `creditWallet()`
 *     (`/api/accounts/wallet/credit`) — e.g. to fulfil a "contact
 *     support for a refund" promise made elsewhere in the app, since
 *     there's still no automatic refund-on-Enrollment-rejection flow
 *     and Razorpay refunds aren't wired up anywhere else.
 *  2. A parent topping up their own Wallet with a real Razorpay
 *     payment (`createWalletTopupOrder` / `verifyWalletTopup`,
 *     added Sep 7, 2026 — see `/api/parent/wallet/order` +
 *     `/verify`). This is a new capability, not something
 *     06-OPEN-DECISIONS.md #28 itself called for — it only decided
 *     the refund direction. Flagging rather than assuming it's fine
 *     to let parents fund a Wallet ahead of any actual refund.
 *
 * `debitWallet()` is included as the natural counterpart to both but
 * still has no caller anywhere — whether a Wallet balance can be
 * spent toward a future Enrollment/demo payment is still an open
 * question, not decided here.
 */

export class WalletError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
export async function getOrCreateWallet(parentId: string) {
  const existing = await prisma.wallet.findUnique({ where: { parentId } });

  if (existing) {
    return existing;
  }

  return prisma.wallet.create({
    data: { parentId, balance: 0 },
  });
}
export interface WalletAdjustmentInput {
  parentId: string;
  /** Always positive, in rupees — direction comes from which function is called. */
  amount: number;
  reason: string;
  referenceType?: string;
  referenceId?: string;
  /** Cognito `sub` of the Admin/Accounts login issuing this, if manual. */
  createdByStaffSub?: string;
  /** Set only for a Razorpay-backed top-up — see createWalletTopupOrder/verifyWalletTopup. */
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
}
function assertValidAdjustment(input: WalletAdjustmentInput) {
  if (!input.parentId) {
    throw new WalletError("parentId is required.");
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new WalletError("Amount must be a positive number.");
  }

  if (!input.reason?.trim()) {
    throw new WalletError("A reason is required for every wallet transaction.");
  }
}
/**
 * Credits a parent's Wallet — the only way money enters a Wallet
 * today. Creates the Wallet row on first use, same as
 * getOrCreateWallet(). Runs inside a transaction so the balance
 * update and the WalletTransaction row can never drift apart.
 */
export async function creditWallet(input: WalletAdjustmentInput) {
  assertValidAdjustment(input);

  const result = await prisma.$transaction(async (tx) => {
    let wallet = await tx.wallet.findUnique({ where: { parentId: input.parentId } });

    if (!wallet) {
      wallet = await tx.wallet.create({
        data: { parentId: input.parentId, balance: 0 },
      });
    }

    // Decimal fields need an explicit Number(...) conversion before
    // Prisma writes (02-ARCHITECTURE.md's Prisma 7 gotcha — bit
    // Course.price once already).
    const balanceAfter = Number(wallet.balance) + input.amount;

    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: balanceAfter },
    });

    const transaction = await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: WalletTransactionType.CREDIT,
        amount: input.amount,
        balanceAfter,
        reason: input.reason.trim(),
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        createdByStaffSub: input.createdByStaffSub,
        razorpayOrderId: input.razorpayOrderId,
        razorpayPaymentId: input.razorpayPaymentId,
      },
    });

    return { wallet: updatedWallet, transaction };
  });

  await notifyWalletCredited(input.parentId, input.amount, input.reason);

  // Invoices (Sep 11, 2026) — only self-funded top-ups (the caller
  // passes `razorpayOrderId`) are a real payment worth a receipt.
  // Accounts' manual credits (refunds, adjustments) go through this
  // exact same function with no Razorpay ids attached — those
  // deliberately stay un-invoiced, since there's no gateway charge
  // behind them to receipt (see the Invoice model's doc-comment).
  if (input.razorpayOrderId) {
    try {
      await generateInvoiceForPayment({
        type: InvoiceType.WALLET_TOPUP,
        payerId: input.parentId,
        amount: input.amount,
        description: "Wallet top-up",
        referenceType: "WALLET_TOPUP",
        referenceId: result.transaction.id,
        razorpayOrderId: input.razorpayOrderId,
        razorpayPaymentId: input.razorpayPaymentId,
      });
    } catch (err) {
      console.error("Invoice generation failed (wallet top-up still succeeded):", err);
    }
  }

  return result;
}
/**
 * Debits a parent's Wallet. No caller exists yet anywhere in the
 * app (see file header) — kept here so a future "pay with wallet
 * balance" flow doesn't have to build the transactional balance
 * bookkeeping from scratch. Throws if the wallet doesn't exist yet
 * or doesn't have enough balance — a Wallet can never go negative.
 */
export async function debitWallet(input: WalletAdjustmentInput) {
  assertValidAdjustment(input);

  return prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { parentId: input.parentId } });

    if (!wallet || Number(wallet.balance) < input.amount) {
      throw new WalletError("Insufficient wallet balance for this debit.", 402);
    }

    const balanceAfter = Number(wallet.balance) - input.amount;

    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: balanceAfter },
    });

    const transaction = await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: WalletTransactionType.DEBIT,
        amount: input.amount,
        balanceAfter,
        reason: input.reason.trim(),
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        createdByStaffSub: input.createdByStaffSub,
      },
    });

    return { wallet: updatedWallet, transaction };
  });
}
/**
 * The shape the Parent-facing Wallet page needs: current balance
 * plus recent transaction history, most recent first.
 */
export async function getWalletSummaryForParent(parentId: string, limit = 50) {
  const wallet = await getOrCreateWallet(parentId);

  const transactions = await prisma.walletTransaction.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return {
    balance: Number(wallet.balance),
    transactions: transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      balanceAfter: Number(t.balanceAfter),
      reason: t.reason,
      referenceType: t.referenceType,
      referenceId: t.referenceId,
      createdAt: t.createdAt,
    })),
  };
}
/**
 * Accounts/Admin-facing list — every ParentProfile with its Wallet
 * balance (0 for parents who've never had a Wallet row created
 * yet), so Accounts can find and credit ANY parent, not only ones
 * who already happen to have a Wallet row.
 */
export async function listParentWalletsForAccounts() {
  const parents = await prisma.parentProfile.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      wallet: { select: { balance: true, updatedAt: true } },
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  return parents.map((p) => ({
    parentId: p.id,
    parentName: `${p.firstName} ${p.lastName}`.trim(),
    email: p.email,
    balance: p.wallet ? Number(p.wallet.balance) : 0,
    updatedAt: p.wallet?.updatedAt ?? null,
  }));
}
