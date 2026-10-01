import { NextResponse } from "next/server";

import { requireTeacherId } from "@/features/teacher/server/auth";
import { listVacanciesForTeacher } from "@/features/shared/server/classRequest.service";

/** GET — open vacancies, plus ones this Teacher already answered. No Parent details. */
export async function GET(req: Request) {
  try {
    const teacher = await requireTeacherId(req);
    if ("error" in teacher) return teacher.error;

    const vacancies = await listVacanciesForTeacher(teacher.teacherId);

    return NextResponse.json({ success: true, vacancies });
  } catch (error) {
    console.error("Teacher class-requests GET error:", error);

    return NextResponse.json({ error: "Failed to load vacancies." }, { status: 500 });
  }
}
