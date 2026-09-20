import { NextResponse } from "next/server";

import { requireTeacherId } from "@/features/teacher/server/auth";
import {
  listSessionsForEnrollment,
  ClassSessionError,
} from "@/features/shared/server/classSession.service";
import { resolveEndedSessionsForEnrollments } from "@/features/shared/server/sessionResolve.service";

/**
 * GET
 *
 * Every real, dated `ClassSession` row for this enrollment
 * (SCHEDULED/COMPLETED/CANCELLED/MISSED and the session-flow outcomes), earliest first. Generates
 * any missing upcoming sessions first (lazy/idempotent — see
 * classSession.service.ts). Backs the Teacher's per-enrollment
 * "Sessions" list, which lets a specific date be marked complete
 * (`PATCH /api/teacher/class-sessions/[sessionId]/complete`) instead
 * of only the one-click "next due session" button.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ enrollmentId: string }> },
) {
  try {
    const { enrollmentId } = await params;

    if (!enrollmentId) {
      return NextResponse.json(
        { error: "Enrollment ID is required." },
        { status: 400 },
      );
    }

    const teacher = await requireTeacherId(req);

    if ("error" in teacher) {
      return teacher.error;
    }

    // Read after end time: settle any cycle session that is over
    // before listing (see sessionResolve.service.ts).
    await resolveEndedSessionsForEnrollments([enrollmentId]);

    const sessions = await listSessionsForEnrollment(
      enrollmentId,
      teacher.teacherId,
    );

    return NextResponse.json({ success: true, sessions });
  } catch (error) {
    if (error instanceof ClassSessionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("List enrollment sessions GET error:", error);

    return NextResponse.json(
      { error: "Failed to load this enrollment's sessions." },
      { status: 500 },
    );
  }
}
