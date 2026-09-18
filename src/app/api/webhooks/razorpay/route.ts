import { NextResponse } from "next/server";

import { verifyWebhookSignature } from "@/lib/razorpay";
import { reconcileEnrollmentFromWebhook } from "@/features/parent/server/enrollment.service";
import {
  reconcileDemoBookingFromWebhook,
  reconcileDemoCouponPurchaseFromWebhook,
} from "@/features/parent/server/demoCoupon.service";
import { reconcileWalletTopupFromWebhook } from "@/features/shared/server/wallet.service";

/**
 * POST — Razorpay webhook endpoint.
 *
 * Configure in the Razorpay Dashboard (Settings -> Webhooks), once
 * per mode (Test Mode and Live Mode each have their own webhook
 * config in the dashboard, and both can point at this same URL):
 *   URL:    https://<your-domain>/api/webhooks/razorpay
 *   Events: payment.captured
 *   Secret: Live Mode -> RAZORPAY_LIVE_WEBHOOK_SECRET
 *           Test Mode -> RAZORPAY_TEST_WEBHOOK_SECRET
 *           (either/both — different from RAZORPAY_LIVE_KEY_SECRET /
 *           RAZORPAY_TEST_KEY_SECRET — generated when you add the
 *           webhook. See src/lib/razorpay.ts for how mode selection
 *           works.)
 *
 * This is a reconciliation safety net, not the primary path. The
 * primary path is the client calling `/api/parent/enrollments/verify`,
 * `/api/parent/demo-bookings/verify`, `/api/parent/wallet/verify`, or
 * `/api/parent/demo-coupons/verify` right after Checkout succeeds.
 * This webhook exists for the case where the payment captured on
 * Razorpay's side but the client never confirmed it back to us
 * (closed the tab, lost network, app crashed) — without it, that
 * money would be captured with no Enrollment/DemoBooking/
 * WalletTransaction/DemoCouponPurchase row to show for it.
 *
 * Uses the raw request body for signature verification — Razorpay
 * signs the exact bytes sent, so this must run before/without any
 * JSON parsing that could alter whitespace.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  let signatureOk: boolean;

  try {
    signatureOk = verifyWebhookSignature({ rawBody, signature });
  } catch (error) {
    console.error("Razorpay webhook: signature check failed to run", error);
    return NextResponse.json({ error: "Signature check failed." }, { status: 500 });
  }

  if (!signatureOk) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let event: {
    event?: string;
    payload?: { payment?: { entity?: { order_id?: string; id?: string } } };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (event.event !== "payment.captured") {
    // Not an event we act on — 200 so Razorpay doesn't keep retrying.
    return NextResponse.json({ success: true, ignored: true });
  }

  const payment = event.payload?.payment?.entity;
  const orderId = payment?.order_id;
  const paymentId = payment?.id;

  if (!orderId || !paymentId) {
    return NextResponse.json({ error: "Malformed payload." }, { status: 400 });
  }

  try {
    const enrollment = await reconcileEnrollmentFromWebhook(orderId, paymentId);

    if (enrollment) {
      return NextResponse.json({ success: true, reconciled: "enrollment" });
    }

    const demoBooking = await reconcileDemoBookingFromWebhook(orderId, paymentId);

    if (demoBooking) {
      return NextResponse.json({ success: true, reconciled: "demo_booking" });
    }

    const walletTopup = await reconcileWalletTopupFromWebhook(orderId, paymentId);

    if (walletTopup) {
      return NextResponse.json({ success: true, reconciled: "wallet_topup" });
    }

    const demoCouponPurchase = await reconcileDemoCouponPurchaseFromWebhook(
      orderId,
      paymentId,
    );

    if (demoCouponPurchase) {
      return NextResponse.json({
        success: true,
        reconciled: "demo_coupon_purchase",
      });
    }

    // Order wasn't recognized, already reconciled, or failed a
    // re-check (amount mismatch, duplicate slot, etc.) — those are
    // logged inside the reconcile functions. Still 200: Razorpay
    // shouldn't retry indefinitely for a case that needs a human,
    // not a retry, to fix.
    return NextResponse.json({ success: true, reconciled: null });
  } catch (error) {
    console.error("Razorpay webhook: reconciliation error", error);
    return NextResponse.json({ error: "Reconciliation failed." }, { status: 500 });
  }
}
