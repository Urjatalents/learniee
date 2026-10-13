import { NextResponse } from "next/server";

import { applyGatewayPayout } from "@/features/shared/server/teacherPayout/gateway";
import { verifyRazorpayXWebhookSignature, type RazorpayXPayoutEntity } from "@/lib/razorpayX";

/**
 * POST — RazorpayX payout webhook (Oct 13, 2026).
 *
 * Configure in the RazorpayX dashboard (Settings -> Developer Controls ->
 * Webhooks):
 *   URL:     https://<your-domain>/api/webhooks/razorpayx
 *   Events:  payout.processed, payout.reversed, payout.rejected,
 *            payout.failed, payout.updated (optionally initiated/queued/pending)
 *   Secret:  RAZORPAYX_WEBHOOK_SECRET
 *
 * Separate from `/api/webhooks/razorpay` (Payments) because RazorpayX has its
 * own webhook secret. Uses the raw body for signature verification.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  try {
    if (!verifyRazorpayXWebhookSignature({ rawBody, signature })) {
      return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
    }
  } catch (error) {
    console.error("RazorpayX webhook: signature check failed to run", error);
    return NextResponse.json({ error: "Signature check failed." }, { status: 500 });
  }

  let event: { event?: string; payload?: { payout?: { entity?: RazorpayXPayoutEntity } } };

  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const entity = event.payload?.payout?.entity;

  if (!event.event?.startsWith("payout.") || !entity?.id || !entity.status) {
    // Not a payout event we act on — 200 so Razorpay doesn't retry.
    return NextResponse.json({ success: true, ignored: true });
  }

  try {
    const result = await applyGatewayPayout(entity);

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("RazorpayX webhook: processing error", error);
    // 500 so RazorpayX retries.
    return NextResponse.json({ error: "Processing failed." }, { status: 500 });
  }
}
