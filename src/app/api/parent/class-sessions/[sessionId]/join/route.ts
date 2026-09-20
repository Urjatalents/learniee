import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";
import { joinSession } from "@/features/shared/server/sessionFlow.service";
import { sessionFlowErrorResponse } from "@/features/shared/server/sessionFlowRoute";

/**
 * POST — the Parent taps Join. Only from 10 minutes before the class
 * begins (enforced here). Records the join time once.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;

    const parent = await requireParentId(req);
    if ("error" in parent) return parent.error;

    const session = await joinSession(sessionId, parent.parentId);

    return NextResponse.json({ success: true, session });
  } catch (error) {
    return sessionFlowErrorResponse(
      error,
      "Parent join session POST",
      "Failed to join this session.",
    );
  }
}
