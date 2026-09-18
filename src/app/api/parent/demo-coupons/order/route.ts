import { NextResponse } from "next/server";

import { requireVerifiedParentId } from "@/features/parent/server/verifiedAuth";
import { getRazorpayKeyId } from "@/lib/razorpay";
import {
  createDemoCouponPurchaseOrder,
  DemoBookingError,
} from "@/features/parent/server/demoCoupon.service";

/**
 * POST
 *
 * Step 1 of the "buy extra demo coupons" flow. Creates a Razorpay
 * Order for the chosen quantity — writes nothing to the DB. The
 * client opens Razorpay Checkout against the returned order, then
 * calls `/api/parent/demo-coupons/verify` with the checkout result.
 *
 * Signature-verified auth (requireVerifiedParentId) — same guard as
 * the Enrollment/DemoBooking/Wallet order routes, since a forged
 * token here would mean a real charge attributed to the wrong
 * parent.
 *
 * Body: { quantity }
 */
export async function POST(req: Request) {
  try {
    const parent = await requireVerifiedParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    const body = await req.json();
    const quantity = Number(body?.quantity);

    const { order, amount } = await createDemoCouponPurchaseOrder(
      parent.parentId,
      quantity,
    );

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: getRazorpayKeyId(),
      totalPayable: amount,
    });
  } catch (error) {
    if (error instanceof DemoBookingError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Parent demo-coupons/order POST error:", error);

    return NextResponse.json(
      { error: "Failed to start your coupon purchase." },
      { status: 500 },
    );
  }
}
