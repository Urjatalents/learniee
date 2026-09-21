import { NextResponse } from "next/server";

import { requireVerifiedParentId } from "@/features/parent/server/verifiedAuth";
import {
  createRenewalOrder,
  RenewalError,
} from "@/features/parent/server/renewal.service";

/**
 * POST
 *
 * body: { scheduleDays?: number[], scheduleTime?: string }
 *
 * Step 1 of renewal: prices the next cycle server-side (reusing the
 * Enrollment's current schedule unless the parent picked a different
 * one for next month) and creates a Razorpay order — writes nothing
 * to the DB. Mirrors `/api/parent/enrollments/order`.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ enrollmentId: string }> },
) {
  try {
    const parent = await requireVerifiedParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    const { enrollmentId } = await params;
    const body = await req.json().catch(() => ({}));

    const { order, keyId, pricing } = await createRenewalOrder(enrollmentId, parent.parentId, {
      scheduleDays: body.scheduleDays,
      scheduleTime: body.scheduleTime,
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
      pricing,
    });
  } catch (error) {
    if (error instanceof RenewalError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Parent enrollments/renew/order POST error:", error);

    return NextResponse.json(
      { error: "Failed to start the renewal payment." },
      { status: 500 },
    );
  }
}
