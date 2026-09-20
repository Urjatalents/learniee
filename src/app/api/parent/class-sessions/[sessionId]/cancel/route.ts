import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";
import { cancelSession } from "@/features/shared/server/sessionFlow.service";
import { sessionFlowErrorResponse } from "@/features/shared/server/sessionFlowRoute";

/**
 * POST { reason?: string } — the Parent cancels a session before it
 * starts. 4 hours or more ahead: CANCELLED (does not count). Under
 * 4 hours: CANCELLED_LATE (still counts, paid).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;

    const parent = await requireParentId(req);
    if ("error" in parent) return parent.error;

    const body = await req.json().catch(() => ({}));
    const reason = typeof body?.reason === "string" ? body.reason : null;

    const session = await cancelSession(
      sessionId,
      { role: "PARENT", id: parent.parentId },
      reason,
    );

    return NextResponse.json({ success: true, session });
  } catch (error) {
    return sessionFlowErrorResponse(
      error,
      "Parent cancel session POST",
      "Failed to cancel this session.",
    );
  }
}
