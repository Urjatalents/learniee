import { NextResponse } from "next/server";

import { requireTeacherId } from "@/features/teacher/server/auth";
import {
  getTeacherClassRoster,
  TeacherMyClassesError,
} from "@/features/teacher/server/myClasses.service";

/**
 * GET
 *
 * The roster of students enrolled in one of this Teacher's courses
 * ("Classes live"): each student's status, a chat shortcut and — for
 * cycle-model, active/completed enrollments — a cycle-progress /
 * next-class summary. Scoped to courses this teacher actually has
 * students in; anything else is "not found".
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const { courseId } = await params;

    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required." }, { status: 400 });
    }

    const teacher = await requireTeacherId(req);

    if ("error" in teacher) {
      return teacher.error;
    }

    const roster = await getTeacherClassRoster(courseId, teacher.teacherId);

    return NextResponse.json({ success: true, ...roster });
  } catch (error) {
    if (error instanceof TeacherMyClassesError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Teacher my-classes roster GET error:", error);

    return NextResponse.json(
      { error: "Failed to load this class." },
      { status: 500 },
    );
  }
}
