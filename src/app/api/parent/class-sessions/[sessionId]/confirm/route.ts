import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";
import { confirmSessionOutcome } from "@/features/shared/server/sessionFlow.service";
import { sessionFlowErrorResponse } from "@/features/shared/server/sessionFlowRoute";

/**
 * POST — the Parent taps "All good" on a class whose outcome is
 * final. Accepts the outcome and settles the session. Only within
 * 48 hours of the outcome; after that it is accepted automatically.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;

    const parent = await requireParentId(req);
    if ("error" in parent) return parent.error;

    const session = await confirmSessionOutcome(sessionId, parent.parentId);

    return NextResponse.json({ success: true, session });
  } catch (error) {
    return sessionFlowErrorResponse(
      error,
      "Parent confirm session POST",
      "Failed to confirm this class.",
    );
  }
}
