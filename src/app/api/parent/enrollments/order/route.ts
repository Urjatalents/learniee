import { NextResponse } from "next/server";

import { requireVerifiedParentId } from "@/features/parent/server/verifiedAuth";
import { getRazorpayKeyId } from "@/lib/razorpay";
import {
  createEnrollmentOrder,
  EnrollmentError,
  type CreateEnrollmentInput,
} from "@/features/parent/server/enrollment.service";

/**
 * POST
 *
 * Step 1 of the paid-enrollment flow. Prices the enrollment
 * server-side and creates a Razorpay Order for the total amount —
 * writes nothing to the DB. The client opens Razorpay Checkout
 * against the returned order, then calls
 * `/api/parent/enrollments/verify` with the checkout result.
 */
export async function POST(req: Request) {
  try {
    const parent = await requireVerifiedParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    const input: CreateEnrollmentInput = await req.json();

    if (!input.studentId || !input.teacherId || !input.courseId) {
      return NextResponse.json(
        { error: "studentId, teacherId, and courseId are required." },
        { status: 400 },
      );
    }

    if (!input.sessionsPerMonth) {
      return NextResponse.json(
        { error: "Pick a sessions-per-month cycle before enrolling." },
        { status: 400 },
      );
    }

    if (!input.scheduleDays?.length || !input.scheduleTime) {
      return NextResponse.json(
        { error: "Pick which days and what time classes should happen." },
        { status: 400 },
      );
    }

    const { order, pricing } = await createEnrollmentOrder(
      parent.parentId,
      input,
    );

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: getRazorpayKeyId(),
      pricing,
    });
  } catch (error) {
    if (error instanceof EnrollmentError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Parent enrollments/order POST error:", error);

    return NextResponse.json(
      { error: "Failed to start enrollment payment." },
      { status: 500 },
    );
  }
}
