import { generateInvoiceForPayment } from "@/features/shared/server/invoice.service";
import { notifyDemoBooked } from "@/features/shared/server/notificationTriggers.service";
import { prisma } from "@/lib/prisma";
import {
    getRazorpayClient,
    rupeesToPaise,
    verifyCheckoutSignature,
} from "@/lib/razorpay";
import { DemoBookingStatus, InvoiceType } from "@prisma/client";
import { VerifyDemoBookingPaymentInput, validateDemoBooking } from './booking';
import { DemoBookingError, getOrCreateDemoCoupon, priceDemoBooking } from './shared';

/**
 * Step 2 of the paid-demo flow. Same pattern as
 * verifyEnrollmentPayment(): re-verify the checkout signature,
 * re-fetch the order from Razorpay directly, re-validate the
 * booking (student ownership, no duplicate, future time still
 * holds), and only then write the DemoBooking row.
 *
 * Idempotent on `razorpayOrderId` (unique in the schema).
 *
 * Edge case worth knowing about: if the (teacher, subject, child)
 * slot got taken by a different booking in the gap between order
 * creation and payment completing, this throws a 409 AFTER the
 * money has already been captured by Razorpay — that booking can't
 * be created, so it needs a manual refund. Flagged rather than
 * silently swallowed.
 */
export async function verifyDemoBookingPayment(
  parentId: string,
  input: VerifyDemoBookingPaymentInput,
) {
  const existing = await prisma.demoBooking.findUnique({
    where: { razorpayOrderId: input.razorpayOrderId },
  });

  if (existing) {
    return { booking: existing, usedFreeCoupon: false };
  }

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

  const validated = await validateDemoBooking(parentId, input);

  const razorpay = getRazorpayClient();
  const order = await razorpay.orders.fetch(input.razorpayOrderId);

  if (order.status !== "paid") {
    throw new DemoBookingError(
      `Payment isn't complete yet (status: ${order.status}). Please retry the payment.`,
      402,
    );
  }

  const pricing = await priceDemoBooking(parentId);

  if (Number(order.amount) !== rupeesToPaise(pricing.amountPayable)) {
    throw new DemoBookingError(
      "The paid amount doesn't match the demo fee — contact support with your payment ID for a refund.",
      409,
    );
  }

  const coupon = await getOrCreateDemoCoupon(parentId);

  const booking = await prisma.demoBooking.create({
    data: {
      demoCouponId: coupon.id,
      parentId,
      studentId: validated.studentId,
      teacherId: input.teacherId,
      courseId: input.courseId,
      subject: validated.subject,
      isPaid: true,
      amount: pricing.amountPayable,
      isInternationalPayment: pricing.isInternationalPayment,
      internationalSurchargeAmount: pricing.surchargeAmount,
      status: DemoBookingStatus.CONFIRMED,
      scheduledAt: validated.scheduledDate,
      razorpayOrderId: input.razorpayOrderId,
      razorpayPaymentId: input.razorpayPaymentId,
      paidAt: new Date(),
    },
  });

  await notifyDemoBooked(booking.id);

  // Invoices (Sep 11, 2026) — a receipt for this demo's payment,
  // visible to this Parent and to Accounts/Admin. Never lets a
  // receipt-generation failure block the booking response.
  try {
    await generateInvoiceForPayment({
      type: InvoiceType.DEMO_BOOKING_PAYMENT,
      payerId: parentId,
      amount: Number(booking.amount ?? pricing.amountPayable),
      description: `Demo booking payment${validated.subject ? ` — ${validated.subject}` : ""}`,
      referenceType: "DEMO_BOOKING",
      referenceId: booking.id,
      razorpayOrderId: booking.razorpayOrderId,
      razorpayPaymentId: booking.razorpayPaymentId,
    });
  } catch (err) {
    console.error("Invoice generation failed (demo booking still succeeded):", err);
  }

  return { booking, usedFreeCoupon: false };
}
/**
 * Reconciliation path used ONLY by the Razorpay webhook — see
 * enrollment.service.ts's `reconcileEnrollmentFromWebhook()` for the
 * full reasoning (same pattern, applied to paid demo bookings).
 */
export async function reconcileDemoBookingFromWebhook(
  orderId: string,
  paymentId: string,
) {
  const existing = await prisma.demoBooking.findUnique({
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

  if (notes.kind !== "demo_booking") {
    return null;
  }

  const parentId = String(notes.parentId ?? "");
  const studentId = String(notes.studentId ?? "");
  const teacherId = String(notes.teacherId ?? "");
  const courseId = String(notes.courseId ?? "");
  const subject = notes.subject ? String(notes.subject) : "";
  const scheduledAt = notes.scheduledAt ? String(notes.scheduledAt) : "";

  if (!parentId || !studentId || !teacherId || !courseId || !scheduledAt) {
    console.error("Razorpay webhook: demo order missing notes", orderId);
    return null;
  }

  const pricing = await priceDemoBooking(parentId);

  if (Number(order.amount) !== rupeesToPaise(pricing.amountPayable)) {
    console.error("Razorpay webhook: demo amount mismatch", orderId);
    return null;
  }

  // Duplicate slot check — same as validateDemoBooking(), inlined
  // here since we're working from webhook notes, not a fresh
  // client request.
  const duplicate = await prisma.demoBooking.findUnique({
    where: { teacherId_subject_studentId: { teacherId, subject, studentId } },
  });

  if (duplicate) {
    console.error(
      "Razorpay webhook: demo slot already booked, needs manual refund",
      orderId,
    );
    return null;
  }

  const coupon = await getOrCreateDemoCoupon(parentId);

  const booking = await prisma.demoBooking.create({
    data: {
      demoCouponId: coupon.id,
      parentId,
      studentId,
      teacherId,
      courseId,
      subject,
      isPaid: true,
      amount: pricing.amountPayable,
      isInternationalPayment: pricing.isInternationalPayment,
      internationalSurchargeAmount: pricing.surchargeAmount,
      status: DemoBookingStatus.CONFIRMED,
      scheduledAt: new Date(scheduledAt),
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      paidAt: new Date(),
    },
  });

  await notifyDemoBooked(booking.id);

  // Same Invoice hook as verifyDemoBookingPayment() — this path is
  // the safety net for a payment that captured on Razorpay's side
  // but whose client never confirmed back.
  try {
    await generateInvoiceForPayment({
      type: InvoiceType.DEMO_BOOKING_PAYMENT,
      payerId: parentId,
      amount: Number(booking.amount ?? pricing.amountPayable),
      description: `Demo booking payment${subject ? ` — ${subject}` : ""}`,
      referenceType: "DEMO_BOOKING",
      referenceId: booking.id,
      razorpayOrderId: booking.razorpayOrderId,
      razorpayPaymentId: booking.razorpayPaymentId,
    });
  } catch (err) {
    console.error("Invoice generation failed (webhook demo booking still succeeded):", err);
  }

  return booking;
}
/**
 * Lists every demo booking a parent has made, most recent first —
 * for a future "My demo bookings" view. Not wired into any screen
 * yet, but kept alongside the write path so it doesn't need to be
 * built twice.
 */
export async function getDemoBookingsForParent(parentId: string) {
  return prisma.demoBooking.findMany({
    where: { parentId },
    orderBy: { createdAt: "desc" },
    include: {
      student: {
        select: { id: true, firstName: true, visibleName: true },
      },
      teacher: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          visibleName: true,
        },
      },
      course: {
        select: { id: true, courseTitle: true },
      },
    },
  });
}
