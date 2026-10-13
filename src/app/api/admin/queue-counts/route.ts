import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/verifyAdmin";
import { getAdminQueueCounts } from "@/features/admin/server/queueCounts.service";

/**
 * GET — the numbers behind the Admin sidebar badges and the dashboard
 * queue cards. Signature-verified (`requireAdmin`).
 */
export async function GET() {
  try {
    const admin = await requireAdmin();

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const counts = await getAdminQueueCounts();

    return NextResponse.json({ success: true, counts });
  } catch (error) {
    console.error("Admin queue-counts GET error:", error);

    return NextResponse.json({ error: "Failed to load queue counts." }, { status: 500 });
  }
}
