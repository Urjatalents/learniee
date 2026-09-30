import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";
import { ChatError } from "@/features/chat/server/chat.service";
import { reportChatMessage } from "@/features/chat/server/chatReport.service";

/**
 * POST { reason?: string }
 *
 * The logged-in parent reports a message the other person sent in
 * their own room. Admin sees it at /admin/chat-reports.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ roomId: string; messageId: string }> },
) {
  try {
    const { roomId, messageId } = await params;
    const user = await requireParentId(req);

    if ("error" in user) {
      return user.error;
    }

    const input = await req.json().catch(() => ({}));

    if (input.reason !== undefined && typeof input.reason !== "string") {
      return NextResponse.json({ error: "reason must be text." }, { status: 400 });
    }

    await reportChatMessage({
      roomId,
      messageId,
      reporterRole: "PARENT",
      reporterId: user.parentId,
      reason: input.reason,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof ChatError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("parent chat report POST error:", error);

    return NextResponse.json({ error: "Failed to report the message." }, { status: 500 });
  }
}
