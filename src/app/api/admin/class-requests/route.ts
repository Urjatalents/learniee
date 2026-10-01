import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/verifyAdmin";
import { listClassRequestsForAdmin } from "@/features/shared/server/classRequest.service";

/**
 * GET — every class request with the Parent's details and each Teacher's
 * response. Signature-verified (`requireAdmin`): approving one circulates it to
 * every Teacher (06-OPEN-DECISIONS.md #21).
 */
export async function GET() {
  try {
    const admin = await requireAdmin();

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requests = await listClassRequestsForAdmin();

    return NextResponse.json({ success: true, requests });
  } catch (error) {
    console.error("Admin class-requests GET error:", error);

    return NextResponse.json({ error: "Failed to load class requests." }, { status: 500 });
  }
}
