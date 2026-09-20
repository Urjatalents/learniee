import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";
import { reportSessionOutcome } from "@/features/shared/server/sessionFlow.service";
import { sessionFlowErrorResponse } from "@/features/shared/server/sessionFlowRoute";

/**
 * POST { note: string } — the Parent taps "Report a problem" on a
 * class whose outcome is final. The session stays unsettled and goes
 * to the Admin queue. Only within 48 hours of the outcome, and once.
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
    const note = typeof body?.note === "string" ? body.note : null;

    const session = await reportSessionOutcome(sessionId, parent.parentId, note);

    return NextResponse.json({ success: true, session });
  } catch (error) {
    return sessionFlowErrorResponse(
      error,
      "Parent report session POST",
      "Failed to report this class.",
    );
  }
}
