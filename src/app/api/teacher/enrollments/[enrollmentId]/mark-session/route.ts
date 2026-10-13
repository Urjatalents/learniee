import { NextResponse } from "next/server";

import { requireVerifiedTeacherId } from "@/features/teacher/server/verifiedAuth";
import {
  markSessionCompleted,
  CycleProgressError,
} from "@/features/shared/server/cycleProgress.service";

/**
 * PATCH
 *
 * Marks one session done for this enrollment's current cycle.
 * Manual/Teacher-only for now — placeholder until class scheduling +
 * Zoho confirmation exists (see cycleProgress.service.ts doc-comment).
 * No request body needed.
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

    const enrollment = await markSessionCompleted(
      enrollmentId,
      teacher.teacherId,
    );

    return NextResponse.json({ success: true, enrollment });
  } catch (error) {
    if (error instanceof CycleProgressError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Mark session complete PATCH error:", error);

    return NextResponse.json(
      { error: "Failed to mark this session complete." },
      { status: 500 },
    );
  }
}
