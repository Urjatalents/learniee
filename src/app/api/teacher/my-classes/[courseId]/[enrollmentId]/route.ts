import { NextResponse } from "next/server";

import { requireTeacherId } from "@/features/teacher/server/auth";
import {
  getTeacherStudentDetail,
  TeacherMyClassesError,
} from "@/features/teacher/server/myClasses.service";

/**
 * GET
 *
 * One enrolled student's page under a Teacher's "My Classes" ↦
 * course ↦ student drill-down: cycle progress, upcoming classes and
 * session history (the same data the Parent sees on their own My
 * Classes page), plus the chat room id so the page can embed Chat.
 * Homework has its own panel/endpoint (`/api/teacher/homework`) and
 * isn't duplicated here.
 *
 * `courseId` in the path is only used to build the right "back"
 * link on the client; the lookup itself is by `enrollmentId` +
 * the logged-in teacher, so another teacher's student is simply
 * "not found".
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string; enrollmentId: string }> },
) {
  try {
    const { enrollmentId } = await params;

    if (!enrollmentId) {
      return NextResponse.json({ error: "Enrollment ID is required." }, { status: 400 });
    }

    const teacher = await requireTeacherId(req);

    if ("error" in teacher) {
      return teacher.error;
    }

    const detail = await getTeacherStudentDetail(enrollmentId, teacher.teacherId);

    return NextResponse.json({ success: true, detail });
  } catch (error) {
    if (error instanceof TeacherMyClassesError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Teacher my-classes student GET error:", error);

    return NextResponse.json(
      { error: "Failed to load this student's classes." },
      { status: 500 },
    );
  }
}
