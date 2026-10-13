import { NextResponse } from "next/server";

import { requireVerifiedAdminAuth } from "@/lib/verifiedAdminAuth";
import { getEnrollmentsForAdmin } from "@/features/shared/server/enrollmentApproval.service";

/**
 * GET
 *
 * Admin's action queue — enrollments the Teacher has already
 * approved (PENDING_ADMIN_APPROVAL only). Anything still with the
 * Teacher, or waiting on the Parent to reconfirm a revision, isn't
 * Admin's turn yet and is left out.
 */
export async function GET(req: Request) {
  try {
    const auth = await requireVerifiedAdminAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    const enrollments = await getEnrollmentsForAdmin();

    return NextResponse.json({ success: true, enrollments });
  } catch (error) {
    console.error("Admin enrollments GET error:", error);

    return NextResponse.json(
      { error: "Failed to fetch enrollments." },
      { status: 500 },
    );
  }
}
