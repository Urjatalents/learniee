import { NextResponse } from "next/server";

import { requireVerifiedTeacherId } from "@/features/teacher/server/verifiedAuth";
import { getTeacherCertificateBoard } from "@/features/shared/server/certificate.service";

/**
 * GET
 *
 * The Teacher's Certification tab: enrollments that have reached
 * their course's session threshold and are waiting on a decision
 * (`eligible`), plus every certificate already issued or declined
 * (`decided`).
 */
export async function GET(req: Request) {
  try {
    const teacher = await requireVerifiedTeacherId(req);

    if ("error" in teacher) {
      return teacher.error;
    }

    const board = await getTeacherCertificateBoard(teacher.teacherId);

    return NextResponse.json({ success: true, ...board });
  } catch (error) {
    console.error("Teacher certificates GET error:", error);

    return NextResponse.json(
      { error: "Failed to fetch certificates." },
      { status: 500 },
    );
  }
}
