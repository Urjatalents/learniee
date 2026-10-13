import { NextResponse } from "next/server";

import { requireVerifiedTeacherId } from "@/features/teacher/server/verifiedAuth";
import {
  markClassSessionComplete,
  ClassSessionError,
} from "@/features/shared/server/classSession.service";
import { logActivity } from "@/features/shared/server/activityLog.service";

/**
 * PATCH
 *
 * Marks one specific, real `ClassSession` complete — the
 * pick-a-specific-date counterpart to the existing one-click "Mark
 * session complete" button (`PATCH
 * /api/teacher/enrollments/[id]/mark-session`, which now marks the
 * earliest due SCHEDULED session instead of blindly incrementing a
 * counter). No request body needed.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required." },
        { status: 400 },
      );
    }

    const teacher = await requireVerifiedTeacherId(req);

    if ("error" in teacher) {
      return teacher.error;
    }

    const enrollment = await markClassSessionComplete(
      sessionId,
      teacher.teacherId,
    );

    // Covers both "lecture started" and "lecture ended" from the
    // Activity Log's point of view — per direct instruction
    // (StartClassSessionPage's own doc-comment), clicking "Start
    // Session" immediately marks this same session complete rather
    // than opening a separate in-progress state, since there's no
    // real video room yet. There is currently no distinct
    // "started" event to log.
    const studentName =
      enrollment.student.visibleName || enrollment.student.firstName;
    const courseTitle = enrollment.course.courseTitle || "a course";

    await logActivity({
      action: "CLASS_SESSION_COMPLETED",
      actorRole: "TEACHER",
      actorId: teacher.teacherId,
      description: `Class session marked complete for ${studentName} — "${courseTitle}".`,
      metadata: { sessionId, enrollmentId: enrollment.id },
    });

    return NextResponse.json({ success: true, enrollment });
  } catch (error) {
    if (error instanceof ClassSessionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Mark class session complete PATCH error:", error);

    return NextResponse.json(
      { error: "Failed to mark this session complete." },
      { status: 500 },
    );
  }
}
