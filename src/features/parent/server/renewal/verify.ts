import { prisma } from "@/lib/prisma";
import { getRazorpayClient, verifyCheckoutSignature } from "@/lib/razorpay";
import "server-only";
import { applyPaidRenewal, ensureRenewalInvoice, findCycleForPayment } from './apply';
import { VerifyRenewalPaymentInput } from './order';
import { RenewalError } from './plan';

export async function verifyRenewalPayment(
  enrollmentId: string,
  parentId: string,
  input: VerifyRenewalPaymentInput,
) {
  // The enrollment must belong to the logged-in parent before we say
  // anything about its payments.
  const owned = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, parentId },
    select: { id: true },
  });

  if (!owned) {
    throw new RenewalError("Enrollment not found.", 404);
  }

  const signatureOk = verifyCheckoutSignature({
    orderId: input.razorpayOrderId,
    paymentId: input.razorpayPaymentId,
    signature: input.razorpaySignature,
  });

  if (!signatureOk) {
    throw new RenewalError(
      "Payment verification failed. If money was deducted, it will be auto-refunded — contact support if it isn't reversed within a few days.",
      400,
    );
  }

  // Idempotent on the payment: a retry, or the Razorpay webhook having
  // already reconciled this renewal while the tab was still open,
  // returns the existing cycle without another Razorpay round-trip.
  const existing = await findCycleForPayment(input.razorpayPaymentId);

  if (existing && existing.enrollmentId === enrollmentId) {
    // Repairs a missing invoice if the original attempt failed.
    await ensureRenewalInvoice({
      cycle: existing,
      orderId: input.razorpayOrderId,
      paymentId: input.razorpayPaymentId,
    });

    return { cycle: existing };
  }

  const razorpay = getRazorpayClient();
  const order = await razorpay.orders.fetch(input.razorpayOrderId);

  if (order.status !== "paid") {
    throw new RenewalError(
      `Payment isn't complete yet (status: ${order.status}). Please retry the payment.`,
      402,
    );
  }

  const { cycle } = await applyPaidRenewal({
    order,
    paymentId: input.razorpayPaymentId,
    parentId,
    enrollmentId,
  });

  return { cycle };
}
