import { NextResponse } from "next/server";

import { requireTeacherId } from "@/features/teacher/server/auth";
import { getTeacherClasses } from "@/features/teacher/server/myClasses.service";

/**
 * GET
 *
 * Backs the Teacher's "My Classes" list: one card per course with
 * students enrolled — student/active counts, whether a class is
 * joinable right now, and the soonest upcoming class. Cycle-model
 * enrollments only (legacy ones don't feed a card here; the Teacher
 * keeps managing those from `/teacher/enrollments`).
 */
export async function GET(req: Request) {
  try {
    const teacher = await requireTeacherId(req);

    if ("error" in teacher) {
      return teacher.error;
    }

    const classes = await getTeacherClasses(teacher.teacherId);

    return NextResponse.json({ success: true, classes });
  } catch (error) {
    console.error("Teacher my-classes GET error:", error);

    return NextResponse.json(
      { error: "Failed to load your classes." },
      { status: 500 },
    );
  }
}
