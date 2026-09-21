import { NextResponse } from "next/server";

import { requireTeacherId } from "@/features/teacher/server/auth";
import { getCertificateForTeacher } from "@/features/shared/server/certificate.service";

/**
 * GET
 *
 * A single certificate the logged-in Teacher issued — backs the
 * printable certificate view. 404 both when the id doesn't exist and
 * when it belongs to a different teacher.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ certificateId: string }> },
) {
  try {
    const { certificateId } = await params;

    const teacher = await requireTeacherId(req);

    if ("error" in teacher) {
      return teacher.error;
    }

    const certificate = await getCertificateForTeacher(teacher.teacherId, certificateId);

    if (!certificate) {
      return NextResponse.json({ error: "Certificate not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, certificate });
  } catch (error) {
    console.error("Teacher certificate GET error:", error);

    return NextResponse.json(
      { error: "Failed to fetch this certificate." },
      { status: 500 },
    );
  }
}
