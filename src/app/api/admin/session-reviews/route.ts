import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/verifyAdmin";
import { listSessionReviews } from "@/features/shared/server/sessionReview.service";

/**
 * GET — Admin's class-review queue (Part 2A): classes a parent
 * reported and classes that ran for under half their time
 * (`NEEDS_REVIEW`), plus the ones Admin decided recently. Signature-
 * verified (`requireAdmin`) — a decision here can change what a
 * teacher is paid (06-OPEN-DECISIONS.md #21).
 */
export async function GET() {
  try {
    const admin = await requireAdmin();

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const listing = await listSessionReviews();

    return NextResponse.json({ success: true, ...listing });
  } catch (error) {
    console.error("Admin session-reviews GET error:", error);

    return NextResponse.json({ error: "Failed to load the class reviews." }, { status: 500 });
  }
}
