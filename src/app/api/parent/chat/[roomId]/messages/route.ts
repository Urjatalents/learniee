import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";
import {
  ChatError,
  getRoomForAccess,
  listMessages,
  sendMessage,
} from "@/features/chat/server/chat.service";

/**
 * GET ?after=<ISO timestamp>
 *
 * Lists messages in this room, oldest first. Pass `after` (the
 * `createdAt` of the last message the client already has) to poll
 * for just the new ones — see useChatMessages.ts.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  try {
    const { roomId } = await params;
    const parent = await requireParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    await getRoomForAccess(roomId, { role: "PARENT", actorId: parent.parentId });

    const after = new URL(req.url).searchParams.get("after");
    const messages = await listMessages(
      roomId,
      after ? new Date(after) : undefined,
      { viewer: { role: "PARENT", id: parent.parentId } },
    );

    return NextResponse.json({ success: true, messages });
  } catch (error) {
    if (error instanceof ChatError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Parent chat messages GET error:", error);

    return NextResponse.json(
      { error: "Failed to load messages." },
      { status: 500 },
    );
  }
}

/**
 * POST { body: string }
 *
 * Sends a message as the logged-in parent into this room.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  try {
    const { roomId } = await params;
    const parent = await requireParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    const input = await req.json();

    if (typeof input.body !== "string") {
      return NextResponse.json({ error: "body is required." }, { status: 400 });
    }

    const message = await sendMessage({
      roomId,
      senderRole: "PARENT",
      senderId: parent.parentId,
      body: input.body,
    });

    return NextResponse.json({ success: true, message }, { status: 201 });
  } catch (error) {
    if (error instanceof ChatError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Parent chat messages POST error:", error);

    return NextResponse.json(
      { error: "Failed to send message." },
      { status: 500 },
    );
  }
}
