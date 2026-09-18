import { NextResponse } from "next/server";

import { requireVerifiedParentId } from "@/features/parent/server/verifiedAuth";
import { getRazorpayKeyId } from "@/lib/razorpay";
import { createWalletTopupOrder, WalletError } from "@/features/shared/server/wallet.service";

/**
 * POST
 *
 * Step 1 of the wallet top-up flow. Creates a Razorpay Order for the
 * amount the parent chose — writes nothing to the DB. The client
 * opens Razorpay Checkout against the returned order, then calls
 * `/api/parent/wallet/verify` with the checkout result.
 *
 * Signature-verified auth (requireVerifiedParentId) — same guard as
 * the Enrollment/DemoBooking order routes, since a forged token here
 * would mean a real charge attributed to the wrong parent.
 */
export async function POST(req: Request) {
  try {
    const parent = await requireVerifiedParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    const body = await req.json();
    const amount = Number(body?.amount);

    const order = await createWalletTopupOrder(parent.parentId, amount);

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: getRazorpayKeyId(),
    });
  } catch (error) {
    if (error instanceof WalletError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Parent wallet/order POST error:", error);

    return NextResponse.json(
      { error: "Failed to start your wallet top-up." },
      { status: 500 },
    );
  }
}
