import { NextResponse } from "next/server";

import { requireTeacherId } from "@/features/teacher/server/auth";
import { startSession } from "@/features/shared/server/sessionFlow.service";
import { sessionFlowErrorResponse } from "@/features/shared/server/sessionFlowRoute";

/**
 * POST — the Teacher taps Start. Only from 10 minutes before the
 * class begins (enforced here). Records the start time once.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;

    const teacher = await requireTeacherId(req);
    if ("error" in teacher) return teacher.error;

    const session = await startSession(sessionId, teacher.teacherId);

    return NextResponse.json({ success: true, session });
  } catch (error) {
    return sessionFlowErrorResponse(
      error,
      "Teacher start session POST",
      "Failed to start this session.",
    );
  }
}
