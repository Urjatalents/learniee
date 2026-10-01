import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/verifyAdmin";
import {
  ClassRequestError,
  reviewClassRequest,
} from "@/features/shared/server/classRequest.service";
import { actorFromTokenPayload, logActivity } from "@/features/shared/server/activityLog.service";

/**
 * PATCH { action: "APPROVE" | "REJECT" | "CLOSE", adminNote? }
 *
 * APPROVE circulates the request to every approved Teacher as a vacancy.
 * REJECT needs a note (the Parent sees it). CLOSE ends an open vacancy.
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

    if (action !== "APPROVE" && action !== "REJECT" && action !== "CLOSE") {
      return NextResponse.json(
        { error: "action must be APPROVE, REJECT or CLOSE." },
        { status: 400 },
      );
    }

    const result = await reviewClassRequest({
      requestId,
      action,
      adminNote: body?.adminNote,
      reviewedBySub: admin.sub,
    });

    await logActivity({
      action: action === "CLOSE" ? "CLASS_REQUEST_CLOSED" : "CLASS_REQUEST_REVIEWED",
      actorRole: "ADMIN",
      ...actorFromTokenPayload({
        sub: admin.sub,
        email: admin.email as string | undefined,
        given_name: admin.given_name as string | undefined,
        family_name: admin.family_name as string | undefined,
      }),
      description: `Class request "${result.title}" ${
        action === "APPROVE" ? "approved and circulated" : action === "REJECT" ? "rejected" : "closed"
      }.`,
      metadata: { classRequestId: requestId, action },
    });

    return NextResponse.json({ success: true, status: result.status });
  } catch (error) {
    if (error instanceof ClassRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Admin class-requests PATCH error:", error);

    return NextResponse.json({ error: "Failed to update this request." }, { status: 500 });
  }
}
