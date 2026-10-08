import { generateInvoiceForPayment } from "@/features/shared/server/invoice.service";
import { notifyEnrollmentCreated } from "@/features/shared/server/notificationTriggers.service";
import { processReferralRewardForNewEnrollment } from "@/features/shared/server/referral.service";
import { prisma } from "@/lib/prisma";
import {
    getRazorpayClient,
    rupeesToPaise,
    verifyCheckoutSignature,
} from "@/lib/razorpay";
import {
    InvoiceType
} from "@prisma/client";
import { buildEnrollmentCreateData, parseInputFromNotes, priceOptionsFromNotes } from './notes';
import { VerifyEnrollmentPaymentInput } from './order';
import { priceEnrollment } from './pricing';
import { EnrollmentError } from './types';

/**
 * Step 2 of the paid-enrollment flow. Re-verifies the checkout
 * signature, re-fetches the order from Razorpay directly (never
 * trusts the amount the client reports back), re-runs the exact
 * same pricing used to create the order, and only then writes the
 * Enrollment row.
 *
 * Idempotent on `razorpayOrderId` (unique in the schema) — if this
 * is called twice for the same order (e.g. a retried client
 * request after a flaky network response), the second call just
 * returns the already-created Enrollment instead of erroring or
 * double-charging/double-creating.
 */
export async function verifyEnrollmentPayment(
  parentId: string,
  clientInput: VerifyEnrollmentPaymentInput,
) {
  const existing = await prisma.enrollment.findUnique({
    where: { razorpayOrderId: clientInput.razorpayOrderId },
    include: { chatRoom: { select: { id: true } } },
  });

  if (existing) {
    return existing;
  }

  const signatureOk = verifyCheckoutSignature({
    orderId: clientInput.razorpayOrderId,
    paymentId: clientInput.razorpayPaymentId,
    signature: clientInput.razorpaySignature,
  });

  if (!signatureOk) {
    throw new EnrollmentError(
      "Payment verification failed. If money was deducted, it will be auto-refunded — contact support if it isn't reversed within a few days.",
      400,
    );
  }

  const razorpay = getRazorpayClient();
  const order = await razorpay.orders.fetch(clientInput.razorpayOrderId);

  if (order.status !== "paid") {
    throw new EnrollmentError(
      `Payment isn't complete yet (status: ${order.status}). Please retry the payment.`,
      402,
    );
  }

  const notes = (order.notes ?? {}) as Record<string, unknown>;
  const options = priceOptionsFromNotes(notes);

  // Under the cycle model the order's own notes are the source of
  // truth for what was booked (start date, weekdays, time) — not the
  // request body — so a verify call can't swap the schedule after
  // paying. Orders from before the cycle model (no `model` note) keep
  // using the request body exactly as they always did.
  let input: VerifyEnrollmentPaymentInput = clientInput;

  if (options.model === "CYCLE_V1") {
    if (notes.parentId && String(notes.parentId) !== parentId) {
      throw new EnrollmentError("This payment belongs to another account.", 403);
    }

    input = { ...clientInput, ...parseInputFromNotes(notes) };
  }

  const priced = await priceEnrollment(parentId, input, options);

  const expectedPaise = rupeesToPaise(priced.amountPayable);

  if (Number(order.amount) !== expectedPaise) {
    // The order amount no longer matches what this course/cycle
    // combination prices to right now (e.g. Course.price changed
    // mid-checkout, or the parent's international status changed) —
    // refuse rather than create an Enrollment for the wrong amount.
    // The payment itself already succeeded against Razorpay's
    // order, so this needs a manual refund.
    throw new EnrollmentError(
      "The paid amount no longer matches this course's current price — contact support with your payment ID for a refund.",
      409,
    );
  }

  const enrollment = await prisma.enrollment.create({
    data: buildEnrollmentCreateData({
      parentId,
      input,
      priced,
      orderId: input.razorpayOrderId,
      paymentId: input.razorpayPaymentId,
    }),
    // Included so the client can immediately offer "chat with your
    // teacher" right after payment confirmation without a second
    // round trip.
    include: { chatRoom: { select: { id: true } } },
  });

  // Refer & Earn: if this Parent was referred and this is their
  // first-ever Enrollment, credit the referrer's Wallet. Never lets
  // a referral-processing failure block the payment/Enrollment
  // response the Parent is waiting on.
  try {
    await processReferralRewardForNewEnrollment(parentId, enrollment.id);
  } catch (err) {
    console.error("Referral reward processing failed (enrollment still succeeded):", err);
  }

  await notifyEnrollmentCreated(enrollment.id);

  // Invoices (Sep 11, 2026) — a receipt for the payment that just
  // cleared, visible to this Parent and to Accounts/Admin. Never
  // lets a receipt-generation failure block the response the Parent
  // is waiting on (same reasoning as the referral try/catch above).
  try {
    await generateInvoiceForPayment({
      type: InvoiceType.ENROLLMENT_PAYMENT,
      payerId: parentId,
      amount: Number(enrollment.amountPaid),
      description: `Enrollment payment${priced.subject ? ` — ${priced.subject}` : ""}`,
      referenceType: "ENROLLMENT",
      referenceId: enrollment.id,
      razorpayOrderId: enrollment.razorpayOrderId,
      razorpayPaymentId: enrollment.razorpayPaymentId,
    });
  } catch (err) {
    console.error("Invoice generation failed (enrollment still succeeded):", err);
  }

  return enrollment;
}
