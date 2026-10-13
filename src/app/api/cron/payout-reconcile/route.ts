import { NextResponse } from "next/server";

import { reconcileProcessingPayouts } from "@/features/shared/server/teacherPayout/gateway";
import { isRazorpayXEnabled } from "@/lib/razorpayX";

/**
 * GET /api/cron/payout-reconcile
 *
 * Safety net for RazorpayX payouts stuck in PROCESSING (missed webhook, or a
 * timeout before we got an answer): fetches the real status, or re-sends with
 * the same idempotency key. Mass-pay also runs this before every batch.
 *
 * Not in `vercel.json` (Hobby = daily crons only) and nothing schedules it on
 * the Docker host — hit it every ~15 min from a host cron / external
 * scheduler with `Authorization: Bearer ${CRON_SECRET}`.
 */
export async function GET(req: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!isRazorpayXEnabled()) {
      return NextResponse.json({ success: true, skipped: "RAZORPAYX_ENABLED is not true" });
    }

    const result = await reconcileProcessingPayouts();

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Payout reconcile cron error:", error);
    return NextResponse.json({ error: "Payout reconcile failed." }, { status: 500 });
  }
}
