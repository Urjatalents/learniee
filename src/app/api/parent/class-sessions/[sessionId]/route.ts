import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";
import { getSessionFlowState } from "@/features/shared/server/sessionFlow.service";
import { sessionFlowErrorResponse } from "@/features/shared/server/sessionFlowRoute";

/**
 * GET
 *
 * The Parent's view of one class session: its times, the recorded
 * Start / Join / End events and its outcome. A cycle session whose
 * time is up is resolved (`resolveSession`) before it's returned.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;

    const parent = await requireParentId(req);
    if ("error" in parent) return parent.error;

    const session = await getSessionFlowState(sessionId, {
      role: "PARENT",
      id: parent.parentId,
    });

    return NextResponse.json({ success: true, session });
  } catch (error) {
    return sessionFlowErrorResponse(
      error,
      "Parent class session GET",
      "Failed to load this session.",
    );
  }
}
