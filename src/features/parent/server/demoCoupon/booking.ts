import { notifyDemoBooked } from "@/features/shared/server/notificationTriggers.service";
import { prisma } from "@/lib/prisma";
import {
    getRazorpayClient,
    rupeesToPaise
} from "@/lib/razorpay";
import { DemoBookingStatus } from "@prisma/client";
import { DemoBookingError, getOrCreateDemoCoupon, priceDemoBooking } from './shared';

export interface CreateDemoBookingInput {
  studentId: string;
  teacherId: string;
  courseId: string;
  subject?: string | null;
  /**
   * Required (route.ts rejects a missing value before this is
   * even called) — a demo can't be arranged without a specific
   * time, so this is no longer treated as optional the way it
   * briefly was.
   */
  scheduledAt: string;
}
interface ValidatedDemoBooking {
  studentId: string;
  subject: string;
  scheduledDate: Date;
}
/**
 * Shared validation for both the free-demo path and the paid-demo
 * Razorpay order/verify path — student ownership, course existence,
 * a valid future `scheduledAt`, and the 1-per-(teacher, subject,
 * child) cap.
 */
export async function validateDemoBooking(
  parentId: string,
  input: CreateDemoBookingInput,
): Promise<ValidatedDemoBooking> {
  const student = await prisma.student.findFirst({
    where: { id: input.studentId, parentId },
    select: { id: true },
  });

  if (!student) {
    throw new DemoBookingError(
      "This child profile doesn't belong to your account.",
      404,
    );
  }

  const course = await prisma.course.findFirst({
    where: { id: input.courseId, teacherId: input.teacherId },
    select: { id: true, subject: true },
  });

  if (!course) {
    throw new DemoBookingError("Course not found.", 404);
  }

  const scheduledDate = new Date(input.scheduledAt);

  if (Number.isNaN(scheduledDate.getTime())) {
    throw new DemoBookingError(
      "That doesn't look like a valid date and time — pick again.",
      400,
    );
  }

  if (scheduledDate.getTime() < Date.now()) {
    throw new DemoBookingError(
      "Pick a date and time in the future for the demo.",
      400,
    );
  }

  const subject = (input.subject ?? course.subject ?? "").trim();

  const existingBooking = await prisma.demoBooking.findUnique({
    where: {
      teacherId_subject_studentId: {
        teacherId: input.teacherId,
        subject,
        studentId: input.studentId,
      },
    },
  });

  if (existingBooking) {
    throw new DemoBookingError(
      "A demo with this teacher for this subject has already been used for this child.",
      409,
    );
  }

  return { studentId: input.studentId, subject, scheduledDate };
}
/**
 * Books a FREE demo session (account still has one of its 2 free
 * demos left). No Razorpay involvement at all — this only ever
 * writes a `CONFIRMED` booking with `isPaid: false`.
 *
 * Throws if no free demo remains — callers (route.ts) should check
 * `getDemoCouponBalance()` first and route to the paid order/verify
 * flow below instead.
 */
export async function createFreeDemoBooking(
  parentId: string,
  input: CreateDemoBookingInput,
) {
  const validated = await validateDemoBooking(parentId, input);
  const coupon = await getOrCreateDemoCoupon(parentId);

  if (coupon.usedCount >= coupon.totalIssued) {
    throw new DemoBookingError(
      "No free demos left on this account — pay to book this demo instead.",
      402,
    );
  }

  const booking = await prisma.$transaction(async (tx) => {
    await tx.demoCoupon.update({
      where: { id: coupon.id },
      data: { usedCount: { increment: 1 } },
    });

    return tx.demoBooking.create({
      data: {
        demoCouponId: coupon.id,
        parentId,
        studentId: validated.studentId,
        teacherId: input.teacherId,
        courseId: input.courseId,
        subject: validated.subject,
        isPaid: false,
        amount: null,
        status: DemoBookingStatus.CONFIRMED,
        scheduledAt: validated.scheduledDate,
      },
    });
  });

  await notifyDemoBooked(booking.id);

  return { booking, usedFreeCoupon: true };
}
/**
 * Step 1 of the paid-demo flow (used once the account's 2 free
 * demos are used up). Validates everything a booking needs, then
 * creates a Razorpay Order for the flat ₹100 fee. Nothing is
 * written to the DB yet — same reasoning as
 * enrollment.service.ts's createEnrollmentOrder().
 */
export async function createDemoBookingOrder(
  parentId: string,
  input: CreateDemoBookingInput,
) {
  const validated = await validateDemoBooking(parentId, input);
  const coupon = await getOrCreateDemoCoupon(parentId);

  if (coupon.usedCount < coupon.totalIssued) {
    throw new DemoBookingError(
      "This account still has a free demo available — use the free booking flow instead of paying.",
      400,
    );
  }

  const pricing = await priceDemoBooking(parentId);
  const razorpay = getRazorpayClient();

  const order = await razorpay.orders.create({
    amount: rupeesToPaise(pricing.amountPayable),
    currency: "INR",
    receipt: `demo_${Date.now()}`,
    // Full enough to reconstruct the DemoBooking from the webhook
    // alone (src/app/api/webhooks/razorpay/route.ts) if the client
    // never calls /verify.
    notes: {
      kind: "demo_booking",
      parentId,
      studentId: validated.studentId,
      teacherId: input.teacherId,
      courseId: input.courseId,
      subject: validated.subject,
      scheduledAt: validated.scheduledDate.toISOString(),
    },
  });

  return { order, amount: pricing.amountPayable, pricing };
}
export interface VerifyDemoBookingPaymentInput extends CreateDemoBookingInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}
