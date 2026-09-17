import { NextResponse } from "next/server";

import { requireAdminAuth } from "@/lib/api-auth";
import { getParentDirectory } from "@/features/shared/server/directory.service";

/**
 * GET — every Parent with onboarding status and summary counts
 * (students, active enrollments, Wallet balance), for the Admin
 * "Parent Directory" overview page. Read-only, decode-only auth — same
 * reasoning as /api/admin/directory/teachers.
 */
export async function GET(req: Request) {
  try {
    const auth = requireAdminAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    const { parents, summary } = await getParentDirectory();

    return NextResponse.json({ success: true, parents, summary });
  } catch (error) {
    console.error("Admin parent directory error:", error);

    return NextResponse.json(
      { error: "Failed to fetch parent directory" },
      { status: 500 },
    );
  }
}
