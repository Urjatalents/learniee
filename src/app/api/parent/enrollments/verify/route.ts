import { NextResponse } from "next/server";

import { requireVerifiedParentId } from "@/features/parent/server/verifiedAuth";
import {
  verifyEnrollmentPayment,
  EnrollmentError,
  type VerifyEnrollmentPaymentInput,
} from "@/features/parent/server/enrollment.service";
import { logActivity } from "@/features/shared/server/activityLog.service";

/**
 * POST
 *
 * Step 2 of the paid-enrollment flow. Called by the client after
 * Razorpay Checkout's `handler` callback fires with a successful
 * payment. Re-verifies everything server-side (signature, order
 * status/amount via Razorpay's API, pricing) before creating the
 * Enrollment row — see enrollment.service.ts.
 */
export async function POST(req: Request) {
  try {
    const parent = await requireVerifiedParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    const input: VerifyEnrollmentPaymentInput = await req.json();

    if (
      !input.razorpayOrderId ||
      !input.razorpayPaymentId ||
      !input.razorpaySignature
    ) {
      return NextResponse.json(
        { error: "Missing Razorpay payment details." },
        { status: 400 },
      );
    }

    if (!input.studentId || !input.teacherId || !input.courseId) {
      return NextResponse.json(
        { error: "studentId, teacherId, and courseId are required." },
        { status: 400 },
      );
    }

    if (!input.scheduleDays?.length || !input.scheduleTime) {
      return NextResponse.json(
        { error: "Pick which days and what time classes should happen." },
        { status: 400 },
      );
    }

    const enrollment = await verifyEnrollmentPayment(parent.parentId, input);

    await logActivity({
      action: "PAYMENT_ENROLLMENT",
      actorRole: "PARENT",
      actorId: parent.parentId,
      description: `Enrollment payment received — ₹${enrollment.amountPaid} (Enrollment ${enrollment.id}).`,
      metadata: {
        enrollmentId: enrollment.id,
        amount: Number(enrollment.amountPaid),
        razorpayPaymentId: enrollment.razorpayPaymentId,
      },
    });

    return NextResponse.json({ success: true, enrollment }, { status: 201 });
  } catch (error) {
    if (error instanceof EnrollmentError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Parent enrollments/verify POST error:", error);

    return NextResponse.json(
      { error: "Failed to confirm enrollment payment." },
      { status: 500 },
    );
  }
}
