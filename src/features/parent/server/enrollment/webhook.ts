import { generateInvoiceForPayment } from "@/features/shared/server/invoice.service";
import { notifyEnrollmentCreated } from "@/features/shared/server/notificationTriggers.service";
import { processReferralRewardForNewEnrollment } from "@/features/shared/server/referral.service";
import { prisma } from "@/lib/prisma";
import {
    getRazorpayClient,
    rupeesToPaise
} from "@/lib/razorpay";
import {
    InvoiceType
} from "@prisma/client";
import { buildEnrollmentCreateData, parseInputFromNotes, priceOptionsFromNotes } from './notes';
import { priceEnrollment } from './pricing';

/**
 * Reconciliation path used ONLY by the Razorpay webhook
 * (src/app/api/webhooks/razorpay/route.ts) for `payment.captured`
 * events on `kind: "enrollment"` orders. Unlike
 * `verifyEnrollmentPayment()`, there's no browser-side checkout
 * signature here — the webhook route itself is the trust boundary
 * (it verifies `X-Razorpay-Signature` against the raw body before
 * ever calling this). This is the safety net for the case where the
 * client paid successfully but never called `/verify` (closed tab,
 * lost network, etc.) — without it, Razorpay would have captured
 * money for an Enrollment that never got created.
 *
 * Idempotent on `razorpayOrderId`, same as `verifyEnrollmentPayment()`.
 */
export async function reconcileEnrollmentFromWebhook(
  orderId: string,
  paymentId: string,
) {
  const existing = await prisma.enrollment.findUnique({
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

  const notes = (order.notes ?? {}) as Record<string, unknown>;

  if (notes.kind !== "enrollment") {
    return null;
  }

  const input = parseInputFromNotes(notes);
  const parentId = String(notes.parentId ?? "");

  if (!parentId || !input.studentId || !input.teacherId || !input.courseId) {
    console.error("Razorpay webhook: enrollment order missing notes", orderId);
    return null;
  }

  const priced = await priceEnrollment(
    parentId,
    input,
    priceOptionsFromNotes(notes),
  );
  const expectedPaise = rupeesToPaise(priced.amountPayable);

  if (Number(order.amount) !== expectedPaise) {
    console.error("Razorpay webhook: enrollment amount mismatch", orderId);
    return null;
  }

  const enrollment = await prisma.enrollment.create({
    data: buildEnrollmentCreateData({
      parentId,
      input,
      priced,
      orderId,
      paymentId,
    }),
  });

  // Same Refer & Earn hook as verifyEnrollmentPayment() — this path
  // exists specifically for the "paid but /verify never got called"
  // case, so it needs the same reward trigger, not just the happy
  // path.
  try {
    await processReferralRewardForNewEnrollment(parentId, enrollment.id);
  } catch (err) {
    console.error("Referral reward processing failed (webhook enrollment still succeeded):", err);
  }

  await notifyEnrollmentCreated(enrollment.id);

  // Same Invoice hook as verifyEnrollmentPayment() — this path is
  // the safety net for a payment that captured on Razorpay's side
  // but whose client never confirmed back, so it needs the same
  // receipt written, not just the happy path.
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
    console.error("Invoice generation failed (webhook enrollment still succeeded):", err);
  }

  return enrollment;
}
