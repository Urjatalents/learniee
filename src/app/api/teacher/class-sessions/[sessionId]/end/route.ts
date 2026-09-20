import { NextResponse } from "next/server";

import { requireTeacherId } from "@/features/teacher/server/auth";
import { endSession } from "@/features/shared/server/sessionFlow.service";
import { sessionFlowErrorResponse } from "@/features/shared/server/sessionFlowRoute";

/**
 * POST — the Teacher taps End. Records the end time and resolves the
 * session's outcome. If the student never joined, only allowed from
 * 10 minutes after the start (ends it as "student absent").
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;

    const teacher = await requireTeacherId(req);
    if ("error" in teacher) return teacher.error;

    const session = await endSession(sessionId, teacher.teacherId);

    return NextResponse.json({ success: true, session });
  } catch (error) {
    return sessionFlowErrorResponse(
      error,
      "Teacher end session POST",
      "Failed to end this session.",
    );
  }
}
