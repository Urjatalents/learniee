import { NextResponse } from "next/server";

import { requireVerifiedTeacherId } from "@/features/teacher/server/verifiedAuth";
import {
  setEnrollmentSchedule,
  EnrollmentApprovalError,
} from "@/features/shared/server/enrollmentApproval.service";

/**
 * PATCH
 *
 * body: { scheduleDays: number[]; scheduleTime: string }
 *
 * Sets/corrects the weekly recurring schedule on an ACTIVE/LAPSED
 * enrollment — no Parent reconfirmation needed (no cost/approval
 * impact, just fixing what days/time classes happen). Mainly for
 * enrollments created before scheduleDays/scheduleTime existed, or
 * a simple correction — see enrollmentApproval.service.ts's
 * doc-comment on setEnrollmentSchedule().
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

    const enrollment = await setEnrollmentSchedule(enrollmentId, teacher.teacherId, {
      scheduleDays: Array.isArray(body?.scheduleDays) ? body.scheduleDays : [],
      scheduleTime: typeof body?.scheduleTime === "string" ? body.scheduleTime : "",
    });

    return NextResponse.json({ success: true, enrollment });
  } catch (error) {
    if (error instanceof EnrollmentApprovalError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Set enrollment schedule PATCH error:", error);

    return NextResponse.json(
      { error: "Failed to update this enrollment's schedule." },
      { status: 500 },
    );
  }
}
