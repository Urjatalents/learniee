import { NextResponse } from "next/server";

import { requireTeacherId } from "@/features/teacher/server/auth";
import { saveSessionSummary } from "@/features/shared/server/sessionFlow.service";
import { sessionFlowErrorResponse } from "@/features/shared/server/sessionFlowRoute";

/**
 * POST { summary: string } — the Teacher adds (or edits) a short
 * summary of the class, once they have ended it. Stored on the
 * session so the class page can show it later (Part 2C).
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
    const summary = typeof body?.summary === "string" ? body.summary : null;

    const session = await saveSessionSummary(sessionId, teacher.teacherId, summary);

    return NextResponse.json({ success: true, session });
  } catch (error) {
    return sessionFlowErrorResponse(
      error,
      "Teacher session summary POST",
      "Failed to save the summary.",
    );
  }
}
