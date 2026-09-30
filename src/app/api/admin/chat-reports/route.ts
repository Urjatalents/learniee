import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/verifyAdmin";
import { listChatReports } from "@/features/chat/server/chatReport.service";

/**
 * GET — Admin's queue of reported chat messages (open first) plus the
 * open count for the dashboard card. Signature-verified (`requireAdmin`).
 */
export async function GET() {
  try {
    const admin = await requireAdmin();

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const listing = await listChatReports();

    return NextResponse.json({ success: true, ...listing });
  } catch (error) {
    console.error("Admin chat-reports GET error:", error);

    return NextResponse.json({ error: "Failed to load reported messages." }, { status: 500 });
  }
}
