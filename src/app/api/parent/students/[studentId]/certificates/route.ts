import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";
import { getCertificatesForStudent } from "@/features/shared/server/certificate.service";

/**
 * GET
 *
 * Certificates issued for one Student, scoped to the logged-in
 * Parent. 404 both when the student doesn't exist and when they
 * belong to a different parent - same "don't leak which case it is"
 * rule as `/api/parent/students/[studentId]`.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  try {
    const { studentId } = await params;

    const parent = await requireParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    const certificates = await getCertificatesForStudent(parent.parentId, studentId);

    if (certificates === null) {
      return NextResponse.json({ error: "Student profile not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, certificates });
  } catch (error) {
    console.error("Parent student certificates GET error:", error);

    return NextResponse.json(
      { error: "Failed to fetch certificates." },
      { status: 500 },
    );
  }
}
