import { NextResponse } from "next/server";

import { requireTeacherId } from "@/features/teacher/server/auth";
import { cancelSession } from "@/features/shared/server/sessionFlow.service";
import { sessionFlowErrorResponse } from "@/features/shared/server/sessionFlowRoute";

/**
 * POST { reason?: string } — the Teacher cancels a session before it
 * starts. Cancelled, does not count.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;

    const teacher = await requireTeacherId(req);
    if ("error" in teacher) return teacher.error;

    const body = await req.json().catch(() => ({}));
    const reason = typeof body?.reason === "string" ? body.reason : null;

    const session = await cancelSession(
      sessionId,
      { role: "TEACHER", id: teacher.teacherId },
      reason,
    );

    return NextResponse.json({ success: true, session });
  } catch (error) {
    return sessionFlowErrorResponse(
      error,
      "Teacher cancel session POST",
      "Failed to cancel this session.",
    );
  }
}
