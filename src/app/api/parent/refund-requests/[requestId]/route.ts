import { NextResponse } from "next/server";

import { requireVerifiedParentId } from "@/features/parent/server/verifiedAuth";
import {
  RefundRequestError,
  cancelRefundRequest,
} from "@/features/shared/server/refundRequest.service";

/** DELETE — the Parent withdraws a request that Admin has not decided yet. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  try {
    const { requestId } = await params;

    const parent = await requireVerifiedParentId(req);
    if ("error" in parent) return parent.error;

    await cancelRefundRequest(parent.parentId, requestId);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof RefundRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Parent refund-requests DELETE error:", error);

    return NextResponse.json({ error: "Failed to cancel this request." }, { status: 500 });
  }
}
