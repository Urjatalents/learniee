import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";
import {
  getClassDetail,
  MyClassesError,
} from "@/features/parent/server/myClasses.service";

/**
 * GET
 *
 * One enrollment's My Classes page (Part 2C): course and teacher
 * info, cycle progress ("Session 3 of 9", days left of 45), the
 * upcoming classes, and the session history with each class's result
 * and the teacher's summary. Cycle-model enrollments only — a legacy
 * one answers 409 and keeps its old view.
 *
 * The enrollment is looked up by id AND the logged-in parent, so
 * another parent's enrollment is simply "not found".
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

    const parent = await requireParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    const detail = await getClassDetail(enrollmentId, parent.parentId);

    return NextResponse.json({ success: true, detail });
  } catch (error) {
    if (error instanceof MyClassesError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Parent my-classes detail GET error:", error);

    return NextResponse.json(
      { error: "Failed to load this class." },
      { status: 500 },
    );
  }
}
