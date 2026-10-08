import { generateInvoiceForPayment } from "@/features/shared/server/invoice.service";
import {
    DEMO_COUPON_PURCHASE_MAX_QTY,
    DEMO_COUPON_PURCHASE_MIN_QTY,
} from "@/features/shared/utils/demoCouponPurchase";
import { prisma } from "@/lib/prisma";
import {
    getRazorpayClient,
    rupeesToPaise,
    verifyCheckoutSignature,
} from "@/lib/razorpay";
import { InvoiceType } from "@prisma/client";
import { DemoBookingError, FREE_DEMOS_PER_ACCOUNT, priceDemoBooking } from './shared';

// ---------------------------------------------------------------------------
// Buy extra demo coupons ahead of time (added Sep 11, 2026) — resolves the
// 501 placeholder that used to live at /api/parent/demo-coupons/purchase
// ("Razorpay isn't integrated yet"). Same two-step order/verify shape as
// Enrollment, DemoBooking, and Wallet top-up payments (src/lib/razorpay.ts),
// with the same webhook-reconciliation fallback for a client that never
// calls /verify (closed tab, dropped network). Quantity bounds live in
// features/shared/utils/demoCouponPurchase.ts, not here — see that file's
// comment for why.
//
// This is a separate payment from createDemoBookingOrder()/
// verifyDemoBookingPayment() above: those charge the flat ₹100 fee for one
// specific demo at the moment it's booked; this lets a parent top up their
// DemoCoupon.totalIssued balance in bulk, with nothing booked yet.
// ---------------------------------------------------------------------------

function assertValidPurchaseQuantity(quantity: number) {
  if (
    !Number.isInteger(quantity) ||
    quantity < DEMO_COUPON_PURCHASE_MIN_QTY ||
    quantity > DEMO_COUPON_PURCHASE_MAX_QTY
  ) {
    throw new DemoBookingError(
      `Choose between ${DEMO_COUPON_PURCHASE_MIN_QTY} and ${DEMO_COUPON_PURCHASE_MAX_QTY} coupons.`,
    );
  }
}
/**
 * Step 1 of the buy-extra-coupons flow. Writes nothing to the DB —
 * creates a Razorpay Order for `quantity * PAID_DEMO_PRICE`
 * (international surcharge applied the same way as a paid demo
 * booking), and stamps `quantity`/`parentId` into the order's notes
 * so verify/webhook reconciliation never has to trust a
 * client-supplied quantity later.
 */
export async function createDemoCouponPurchaseOrder(
  parentId: string,
  quantity: number,
) {
  assertValidPurchaseQuantity(quantity);

  const pricing = await priceDemoBooking(parentId);
  const totalAmount =
    Math.round(pricing.amountPayable * quantity * 100) / 100;

  const razorpay = getRazorpayClient();

  const order = await razorpay.orders.create({
    amount: rupeesToPaise(totalAmount),
    currency: "INR",
    // Razorpay caps receipt at 40 chars — keep it short.
    receipt: `dcp_${Date.now()}`,
    notes: {
      kind: "demo_coupon_purchase",
      parentId,
      quantity: String(quantity),
    },
  });

  return { order, amount: totalAmount, quantity };
}
export interface VerifyDemoCouponPurchaseInput {
  quantity: number;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}
/**
 * Step 2 of the buy-extra-coupons flow. Same pattern as
 * verifyDemoBookingPayment()/verifyWalletTopup(): re-verify the
 * checkout signature, re-fetch the order from Razorpay directly,
 * confirm the charged amount matches `quantity * PAID_DEMO_PRICE`
 * for this parent, and only then write the DemoCouponPurchase row
 * and bump the balance.
 *
 * Idempotent on `razorpayOrderId` (unique in the schema) — a
 * retried client request just returns the already-created purchase
 * instead of double-crediting coupons.
 */
export async function verifyDemoCouponPurchase(
  parentId: string,
  input: VerifyDemoCouponPurchaseInput,
) {
  const existing = await prisma.demoCouponPurchase.findUnique({
    where: { razorpayOrderId: input.razorpayOrderId },
  });

  if (existing) {
    return existing;
  }

  assertValidPurchaseQuantity(input.quantity);

  const signatureOk = verifyCheckoutSignature({
    orderId: input.razorpayOrderId,
    paymentId: input.razorpayPaymentId,
    signature: input.razorpaySignature,
  });

  if (!signatureOk) {
    throw new DemoBookingError(
      "Payment verification failed. If money was deducted, it will be auto-refunded — contact support if it isn't reversed within a few days.",
      400,
    );
  }

  const razorpay = getRazorpayClient();
  const order = await razorpay.orders.fetch(input.razorpayOrderId);

  if (order.status !== "paid") {
    throw new DemoBookingError(
      `Payment isn't complete yet (status: ${order.status}). Please retry the payment.`,
      402,
    );
  }

  const pricing = await priceDemoBooking(parentId);
  const expectedAmount =
    Math.round(pricing.amountPayable * input.quantity * 100) / 100;

  if (Number(order.amount) !== rupeesToPaise(expectedAmount)) {
    throw new DemoBookingError(
      "The paid amount doesn't match the coupon quantity — contact support with your payment ID for a refund.",
      409,
    );
  }

  const purchase = await prisma.$transaction(async (tx) => {
    await tx.demoCoupon.upsert({
      where: { parentId },
      create: { parentId, totalIssued: FREE_DEMOS_PER_ACCOUNT + input.quantity },
      update: { totalIssued: { increment: input.quantity } },
    });

    return tx.demoCouponPurchase.create({
      data: {
        parentId,
        quantity: input.quantity,
        amount: expectedAmount,
        razorpayOrderId: input.razorpayOrderId,
        razorpayPaymentId: input.razorpayPaymentId,
        paidAt: new Date(),
      },
    });
  });

  // Invoices (Sep 11, 2026) — same "never let a receipt failure
  // block the payment it's attached to" pattern as every other
  // payment path in this file.
  try {
    await generateInvoiceForPayment({
      type: InvoiceType.DEMO_COUPON_PURCHASE,
      payerId: parentId,
      amount: expectedAmount,
      description: `${input.quantity} demo coupon${input.quantity === 1 ? "" : "s"}`,
      referenceType: "DEMO_COUPON_PURCHASE",
      referenceId: purchase.id,
      razorpayOrderId: purchase.razorpayOrderId,
      razorpayPaymentId: purchase.razorpayPaymentId,
    });
  } catch (err) {
    console.error(
      "Invoice generation failed (demo coupon purchase still succeeded):",
      err,
    );
  }

  return purchase;
}
/**
 * Webhook reconciliation fallback for a coupon purchase — same role
 * as reconcileDemoBookingFromWebhook()/reconcileWalletTopupFromWebhook():
 * catches a payment that captured on Razorpay's side but whose
 * client never called `/verify` (closed tab, dropped network).
 */
export async function reconcileDemoCouponPurchaseFromWebhook(
  orderId: string,
  paymentId: string,
) {
  const existing = await prisma.demoCouponPurchase.findUnique({
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

  if (notes.kind !== "demo_coupon_purchase") {
    return null;
  }

  const parentId = String(notes.parentId ?? "");
  const quantity = Number(notes.quantity ?? 0);

  if (!parentId || !Number.isInteger(quantity) || quantity <= 0) {
    console.error(
      "Razorpay webhook: demo coupon purchase order missing notes",
      orderId,
    );
    return null;
  }

  const pricing = await priceDemoBooking(parentId);
  const expectedAmount = Math.round(pricing.amountPayable * quantity * 100) / 100;

  if (Number(order.amount) !== rupeesToPaise(expectedAmount)) {
    console.error("Razorpay webhook: demo coupon purchase amount mismatch", orderId);
    return null;
  }

  const purchase = await prisma.$transaction(async (tx) => {
    await tx.demoCoupon.upsert({
      where: { parentId },
      create: { parentId, totalIssued: FREE_DEMOS_PER_ACCOUNT + quantity },
      update: { totalIssued: { increment: quantity } },
    });

    return tx.demoCouponPurchase.create({
      data: {
        parentId,
        quantity,
        amount: expectedAmount,
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        paidAt: new Date(),
      },
    });
  });

  try {
    await generateInvoiceForPayment({
      type: InvoiceType.DEMO_COUPON_PURCHASE,
      payerId: parentId,
      amount: expectedAmount,
      description: `${quantity} demo coupon${quantity === 1 ? "" : "s"}`,
      referenceType: "DEMO_COUPON_PURCHASE",
      referenceId: purchase.id,
      razorpayOrderId: purchase.razorpayOrderId,
      razorpayPaymentId: purchase.razorpayPaymentId,
    });
  } catch (err) {
    console.error(
      "Invoice generation failed (webhook demo coupon purchase still succeeded):",
      err,
    );
  }

  return purchase;
}
