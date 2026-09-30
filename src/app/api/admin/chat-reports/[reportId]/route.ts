import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/verifyAdmin";
import { ChatError } from "@/features/chat/server/chat.service";
import { markChatReportReviewed } from "@/features/chat/server/chatReport.service";

/** PATCH — Admin marks a reported message as reviewed. */
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  try {
    const { reportId } = await params;
    const admin = await requireAdmin();

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await markChatReportReviewed(reportId, String(admin.sub));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ChatError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Admin chat-reports PATCH error:", error);

    return NextResponse.json({ error: "Failed to update the report." }, { status: 500 });
  }
}
