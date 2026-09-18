import { NextResponse } from "next/server";

import { requireVerifiedParentId } from "@/features/parent/server/verifiedAuth";
import { getRazorpayKeyId } from "@/lib/razorpay";
import {
  createDemoBookingOrder,
  DemoBookingError,
  type CreateDemoBookingInput,
} from "@/features/parent/server/demoCoupon.service";

/**
 * POST
 *
 * Step 1 of the paid-demo flow — only reachable once the account's
 * 2 free demos are used up (06-OPEN-DECISIONS.md #26). Creates a
 * Razorpay Order for the flat ₹100 fee; writes nothing to the DB.
 */
export async function POST(req: Request) {
  try {
    const parent = await requireVerifiedParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    const input: CreateDemoBookingInput = await req.json();

    if (!input.studentId || !input.teacherId || !input.courseId) {
      return NextResponse.json(
        { error: "studentId, teacherId, and courseId are required." },
        { status: 400 },
      );
    }

    if (!input.scheduledAt) {
      return NextResponse.json(
        { error: "Pick a date and time for the demo before booking." },
        { status: 400 },
      );
    }

    const { order, amount, pricing } = await createDemoBookingOrder(
      parent.parentId,
      input,
    );

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: getRazorpayKeyId(),
      amountRupees: amount,
      pricing,
    });
  } catch (error) {
    if (error instanceof DemoBookingError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Parent demo-bookings/order POST error:", error);

    return NextResponse.json(
      { error: "Failed to start demo payment." },
      { status: 500 },
    );
  }
}
