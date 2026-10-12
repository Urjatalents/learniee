import { NextResponse } from "next/server";

import { listRefundRequestsForAdmin } from "@/features/shared/server/refundRequest.service";
import { requireAdmin } from "@/lib/verifyAdmin";

/**
 * GET — every refund request with the Parent's details and the invoice. Signature-verified (`requireAdmin`): this screen moves money
 * (06-OPEN-DECISIONS.md #21).
 */
export async function GET() {
  try {
    const admin = await requireAdmin();

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requests = await listRefundRequestsForAdmin();

    return NextResponse.json({ success: true, requests });
  } catch (error) {
    console.error("Admin refund-requests GET error:", error);

    return NextResponse.json({ error: "Failed to load refund requests." }, { status: 500 });
  }
}
