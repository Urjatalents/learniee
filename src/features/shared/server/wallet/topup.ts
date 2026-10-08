import {
    WALLET_TOPUP_MAX_AMOUNT,
    WALLET_TOPUP_MIN_AMOUNT,
} from "@/features/shared/utils/walletTopup";
import { prisma } from "@/lib/prisma";
import {
    getRazorpayClient,
    rupeesToPaise,
    verifyCheckoutSignature,
} from "@/lib/razorpay";
import { WalletError, creditWallet } from './core';

// ---------------------------------------------------------------------------
// Self-service top-up (added Sep 7, 2026) — a parent adding real money to
// their own Wallet via Razorpay. Same two-step order/verify shape as
// Enrollment and DemoBooking payments (src/lib/razorpay.ts,
// enrollment.service.ts), with the same webhook-reconciliation fallback for
// a client that never calls /verify (closed tab, dropped network).
//
// Bounds (WALLET_TOPUP_MIN_AMOUNT/MAX_AMOUNT) live in
// features/shared/utils/walletTopup.ts, not here — that file has no
// server-only imports, so the Parent-side useWallet hook can import the
// same numbers for client-side validation without pulling src/lib/razorpay.ts
// (which refuses to load outside a server context) into the browser bundle.
// ---------------------------------------------------------------------------

function assertValidTopupAmount(amount: number) {
  if (
    !Number.isFinite(amount) ||
    amount < WALLET_TOPUP_MIN_AMOUNT ||
    amount > WALLET_TOPUP_MAX_AMOUNT
  ) {
    throw new WalletError(
      `Enter an amount between ₹${WALLET_TOPUP_MIN_AMOUNT} and ₹${WALLET_TOPUP_MAX_AMOUNT}.`,
    );
  }
}
/**
 * Step 1 of the top-up flow. Writes nothing to the DB — just creates
 * a Razorpay Order for the amount the parent chose and returns it
 * for the client to open Checkout against. The amount itself is
 * stamped into the order's notes (`amountRupees`) so verify/webhook
 * reconciliation never has to trust anything the client sends back
 * later — only what Razorpay confirms was actually paid.
 */
export async function createWalletTopupOrder(parentId: string, amount: number) {
  assertValidTopupAmount(amount);

  const roundedAmount = Math.round(amount * 100) / 100;
  const razorpay = getRazorpayClient();

  const order = await razorpay.orders.create({
    amount: rupeesToPaise(roundedAmount),
    currency: "INR",
    // Razorpay caps receipt at 40 chars — keep it short.
    receipt: `wtop_${Date.now()}`,
    notes: {
      kind: "wallet_topup",
      parentId,
      amountRupees: String(roundedAmount),
    },
  });

  return order;
}
export interface VerifyWalletTopupInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}
/**
 * Step 2 of the top-up flow. Re-verifies the checkout signature,
 * re-fetches the order from Razorpay directly, confirms it belongs
 * to this parent, and only then credits the Wallet — for the
 * credited amount, trusts Razorpay's own `order.amount`, never a
 * client-supplied number.
 *
 * Idempotent on `razorpayOrderId` (unique on WalletTransaction) —
 * calling this twice for the same order (a retried client request)
 * just returns the already-created transaction instead of
 * double-crediting.
 */
export async function verifyWalletTopup(
  parentId: string,
  input: VerifyWalletTopupInput,
) {
  const existing = await prisma.walletTransaction.findUnique({
    where: { razorpayOrderId: input.razorpayOrderId },
  });

  if (existing) {
    return existing;
  }

  const signatureOk = verifyCheckoutSignature({
    orderId: input.razorpayOrderId,
    paymentId: input.razorpayPaymentId,
    signature: input.razorpaySignature,
  });

  if (!signatureOk) {
    throw new WalletError(
      "Payment verification failed. If money was deducted, it will be auto-refunded — contact support if it isn't reversed within a few days.",
      400,
    );
  }

  const razorpay = getRazorpayClient();
  const order = await razorpay.orders.fetch(input.razorpayOrderId);

  if (order.status !== "paid") {
    throw new WalletError(
      `Payment isn't complete yet (status: ${order.status}). Please retry the payment.`,
      402,
    );
  }

  const notes = order.notes ?? {};

  if (notes.kind !== "wallet_topup" || String(notes.parentId) !== parentId) {
    throw new WalletError("This payment doesn't match your account.", 409);
  }

  const amount = Number(order.amount) / 100;

  const { transaction } = await creditWallet({
    parentId,
    amount,
    reason: "Wallet top-up",
    referenceType: "WALLET_TOPUP",
    razorpayOrderId: input.razorpayOrderId,
    razorpayPaymentId: input.razorpayPaymentId,
  });

  return transaction;
}
/**
 * Webhook reconciliation fallback for a top-up — same role as
 * `reconcileEnrollmentFromWebhook` / `reconcileDemoBookingFromWebhook`
 * in the other payment flows: catches a payment that captured on
 * Razorpay's side but whose client never called `/verify`.
 */
export async function reconcileWalletTopupFromWebhook(
  orderId: string,
  paymentId: string,
) {
  const existing = await prisma.walletTransaction.findUnique({
    where: { razorpayOrderId: orderId },
  });

  if (existing) {
    return existing;
  }

  const razorpay = getRazorpayClient();
  const order = await razorpay.orders.fetch(orderId);

  if (order.status !== "paid") {
    return null;
  }

  const notes = order.notes ?? {};

  if (notes.kind !== "wallet_topup") {
    return null;
  }

  const parentId = String(notes.parentId ?? "");

  if (!parentId) {
    console.error("Razorpay webhook: wallet top-up order missing parentId", orderId);
    return null;
  }

  const amount = Number(order.amount) / 100;

  const { transaction } = await creditWallet({
    parentId,
    amount,
    reason: "Wallet top-up",
    referenceType: "WALLET_TOPUP",
    razorpayOrderId: orderId,
    razorpayPaymentId: paymentId,
  });

  return transaction;
}
