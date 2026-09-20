import { NextResponse } from "next/server";

import { requireTeacherId } from "@/features/teacher/server/auth";
import { getSessionFlowState } from "@/features/shared/server/sessionFlow.service";
import { sessionFlowErrorResponse } from "@/features/shared/server/sessionFlowRoute";

/**
 * GET
 *
 * The Teacher's view of one class session: its times, the recorded
 * Start / Join / End events and its outcome. A cycle session whose
 * time is up is resolved (`resolveSession`) before it's returned.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;

    const teacher = await requireTeacherId(req);
    if ("error" in teacher) return teacher.error;

    const session = await getSessionFlowState(sessionId, {
      role: "TEACHER",
      id: teacher.teacherId,
    });

    return NextResponse.json({ success: true, session });
  } catch (error) {
    return sessionFlowErrorResponse(
      error,
      "Teacher class session GET",
      "Failed to load this session.",
    );
  }
}
