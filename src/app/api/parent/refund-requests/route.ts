import { NextResponse } from "next/server";

import { requireVerifiedParentId } from "@/features/parent/server/verifiedAuth";
import {
  RefundRequestError,
  createRefundRequest,
  listRefundRequestsForParent,
} from "@/features/shared/server/refundRequest.service";

/** GET — this Parent's refund requests (matched to invoices by `invoiceId` on the Payments page). */
export async function GET(req: Request) {
  try {
    const parent = await requireVerifiedParentId(req);
    if ("error" in parent) return parent.error;

    const requests = await listRefundRequestsForParent(parent.parentId);

    return NextResponse.json({ success: true, requests });
  } catch (error) {
    console.error("Parent refund-requests GET error:", error);

    return NextResponse.json({ error: "Failed to load your refund requests." }, { status: 500 });
  }
}

/**
 * POST { invoiceId, reason }
 *
 * Raises a refund request — PENDING until Admin decides
 * (`/admin/refund-requests`). Nothing is refunded by this call.
 */
export async function POST(req: Request) {
  try {
    const parent = await requireVerifiedParentId(req);
    if ("error" in parent) return parent.error;

    const body = await req.json().catch(() => ({}));
    const request = await createRefundRequest(parent.parentId, body ?? {});

    return NextResponse.json({ success: true, request }, { status: 201 });
  } catch (error) {
    if (error instanceof RefundRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Parent refund-requests POST error:", error);

    return NextResponse.json({ error: "Failed to submit your refund request." }, { status: 500 });
  }
}
