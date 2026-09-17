import { NextResponse } from "next/server";

import { requireAdminAuth } from "@/lib/api-auth";
import { getTeacherDirectory } from "@/features/shared/server/directory.service";

/**
 * GET — every Teacher with approval/onboarding status and summary
 * counts (courses, active enrollments), for the Admin "Teacher
 * Directory" overview page. Read-only, not money-adjacent, so this
 * follows the same decode-only auth as the other Admin listing routes
 * (leave-requests, complaints, enrollments) rather than the
 * signature-verified `requireAdmin` used for money routes — see
 * 06-OPEN-DECISIONS.md #21.
 */
export async function GET(req: Request) {
  try {
    const auth = requireAdminAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    const { teachers, summary } = await getTeacherDirectory();

    return NextResponse.json({ success: true, teachers, summary });
  } catch (error) {
    console.error("Admin teacher directory error:", error);

    return NextResponse.json(
      { error: "Failed to fetch teacher directory" },
      { status: 500 },
    );
  }
}
