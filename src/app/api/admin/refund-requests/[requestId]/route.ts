import { NextResponse } from "next/server";

import { actorFromTokenPayload, logActivity } from "@/features/shared/server/activityLog.service";
import {
  RefundRequestError,
  decideRefundRequest,
} from "@/features/shared/server/refundRequest.service";
import { requireAdmin } from "@/lib/verifyAdmin";

/**
 * PATCH { action: "APPROVE" | "REJECT", approvedAmount?, adminNote? }
 *
 * APPROVE credits the Parent's Wallet and marks the request approved in one
 * transaction; `approvedAmount` is required — Admin enters it, nothing is
 * calculated. REJECT needs a note the Parent sees.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  try {
    const { requestId } = await params;

    const admin = await requireAdmin();

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json({ error: "action must be APPROVE or REJECT." }, { status: 400 });
    }

    const actor = actorFromTokenPayload({
      sub: admin.sub,
      email: admin.email as string | undefined,
      given_name: admin.given_name as string | undefined,
      family_name: admin.family_name as string | undefined,
    });

    const result = await decideRefundRequest({
      requestId,
      action,
      approvedAmount: body?.approvedAmount,
      adminNote: body?.adminNote,
      admin: { sub: admin.sub, name: actor.actorName },
    });

    await logActivity({
      action: "REFUND_REQUEST_DECIDED",
      actorRole: "ADMIN",
      ...actor,
      description:
        action === "APPROVE"
          ? `Refund request approved: ₹${result.amount} credited to the parent's wallet.`
          : "Refund request rejected.",
      metadata: { refundRequestId: requestId, action, amount: result.amount },
    });

    return NextResponse.json({ success: true, status: result.status, amount: result.amount });
  } catch (error) {
    if (error instanceof RefundRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Admin refund-requests PATCH error:", error);

    return NextResponse.json({ error: "Failed to update this refund request." }, { status: 500 });
  }
}
