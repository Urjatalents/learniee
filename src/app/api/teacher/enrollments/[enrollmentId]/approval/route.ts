import { NextResponse } from "next/server";

import { requireVerifiedTeacherId } from "@/features/teacher/server/verifiedAuth";
import {
  teacherApproveEnrollment,
  teacherReviseEnrollment,
  teacherRejectEnrollment,
  EnrollmentApprovalError,
} from "@/features/shared/server/enrollmentApproval.service";
import { logActivity } from "@/features/shared/server/activityLog.service";

/**
 * PATCH
 *
 * body: { action: "APPROVE" }
 *     -> forwards the enrollment to Admin as-is.
 * body: { action: "REVISE", cycleStartDate?, sessionsPerMonth?, scheduleDays?, scheduleTime?, note }
 *     -> proposes a schedule/cycle change, sends it back to the
 *        Parent for reconfirmation. `note` is required — shown to
 *        the Parent alongside the Confirm/Decline choice. Further
 *        back-and-forth happens in this enrollment's chat room.
 * body: { action: "REJECT", reason? }
 *     -> rejects outright (terminal).
 */
export async function PATCH(
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

    const teacher = await requireVerifiedTeacherId(req);

    if ("error" in teacher) {
      return teacher.error;
    }

    const body = await req.json();
    const { action } = body;

    let enrollment;

    if (action === "APPROVE") {
      enrollment = await teacherApproveEnrollment(
        enrollmentId,
        teacher.teacherId,
      );
    } else if (action === "REVISE") {
      enrollment = await teacherReviseEnrollment(
        enrollmentId,
        teacher.teacherId,
        {
          cycleStartDate: body.cycleStartDate,
          sessionsPerMonth: body.sessionsPerMonth,
          scheduleDays: body.scheduleDays,
          scheduleTime: body.scheduleTime,
          note: body.note,
        },
      );
    } else if (action === "REJECT") {
      enrollment = await teacherRejectEnrollment(
        enrollmentId,
        teacher.teacherId,
        body.reason,
      );
    } else {
      return NextResponse.json(
        { error: "action must be APPROVE, REVISE, or REJECT." },
        { status: 400 },
      );
    }

    // Only the clean APPROVE path is logged as a major event here —
    // REVISE/REJECT don't have a corresponding ActivityAction value
    // yet (kept to the same "fixed, deliberate list" convention the
    // enum's own doc-comment describes); add one the same way if
    // that coverage is wanted later.
    if (action === "APPROVE") {
      await logActivity({
        action: "ENROLLMENT_TEACHER_APPROVED",
        actorRole: "TEACHER",
        actorId: teacher.teacherId,
        description: `Teacher approved enrollment ${enrollmentId}.`,
        metadata: { enrollmentId },
      });
    }

    return NextResponse.json({ success: true, enrollment });
  } catch (error) {
    if (error instanceof EnrollmentApprovalError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Teacher enrollment approval PATCH error:", error);

    return NextResponse.json(
      { error: "Failed to update this enrollment." },
      { status: 500 },
    );
  }
}
