import { NextResponse } from "next/server";

import { requireCommunityActor } from "@/features/community/server/auth";
import { CommunityError, deleteMessage } from "@/features/community/server/community.service";

export const dynamic = "force-dynamic";

/** DELETE — Admin only. Soft-deletes (the message stays, its text is hidden). */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ messageId: string }> },
) {
  try {
    const { messageId } = await params;
    const auth = await requireCommunityActor();

    if ("error" in auth) {
      return auth.error;
    }

    const message = await deleteMessage(messageId, auth.actor);

    return NextResponse.json({ success: true, message });
  } catch (error) {
    if (error instanceof CommunityError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Community message DELETE error:", error);

    return NextResponse.json({ error: "Failed to remove message." }, { status: 500 });
  }
}
