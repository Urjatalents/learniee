import { NextResponse } from "next/server";

import { requireVerifiedParentId } from "@/features/parent/server/verifiedAuth";
import {
  verifyRenewalPayment,
  RenewalError,
  type VerifyRenewalPaymentInput,
} from "@/features/parent/server/renewal.service";

/**
 * POST
 *
 * body: { razorpayOrderId, razorpayPaymentId, razorpaySignature }
 *
 * Step 2 of renewal: re-verifies everything server-side from the
 * Razorpay order's own notes (never the client body) before writing
 * the next `EnrollmentCycle` row and creating its sessions. Mirrors
 * `/api/parent/enrollments/verify`.
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
    const input: VerifyRenewalPaymentInput = await req.json();

    if (!input.razorpayOrderId || !input.razorpayPaymentId || !input.razorpaySignature) {
      return NextResponse.json(
        { error: "Missing Razorpay payment details." },
        { status: 400 },
      );
    }

    const { cycle } = await verifyRenewalPayment(enrollmentId, parent.parentId, input);

    return NextResponse.json({ success: true, cycle }, { status: 201 });
  } catch (error) {
    if (error instanceof RenewalError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Parent enrollments/renew/verify POST error:", error);

    return NextResponse.json(
      { error: "Failed to confirm the renewal payment." },
      { status: 500 },
    );
  }
}
