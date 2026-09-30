import { NextResponse } from "next/server";

import { requireTeacherId } from "@/features/teacher/server/auth";
import {
  ChatError,
  getRoomForAccess,
  listMessages,
  sendMessage,
} from "@/features/chat/server/chat.service";

/**
 * GET ?after=<ISO timestamp>
 *
 * Lists messages in this room, oldest first. See the parent-side
 * route (`/api/parent/chat/[roomId]/messages`) for the `after`
 * polling contract — identical here.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  try {
    const { roomId } = await params;
    const teacher = await requireTeacherId(req);

    if ("error" in teacher) {
      return teacher.error;
    }

    await getRoomForAccess(roomId, { role: "TEACHER", actorId: teacher.teacherId });

    const after = new URL(req.url).searchParams.get("after");
    const messages = await listMessages(
      roomId,
      after ? new Date(after) : undefined,
      { viewer: { role: "TEACHER", id: teacher.teacherId } },
    );

    return NextResponse.json({ success: true, messages });
  } catch (error) {
    if (error instanceof ChatError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Teacher chat messages GET error:", error);

    return NextResponse.json(
      { error: "Failed to load messages." },
      { status: 500 },
    );
  }
}

/**
 * POST { body: string }
 *
 * Sends a message as the logged-in teacher into this room.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  try {
    const { roomId } = await params;
    const teacher = await requireTeacherId(req);

    if ("error" in teacher) {
      return teacher.error;
    }

    const input = await req.json();

    if (typeof input.body !== "string") {
      return NextResponse.json({ error: "body is required." }, { status: 400 });
    }

    const message = await sendMessage({
      roomId,
      senderRole: "TEACHER",
      senderId: teacher.teacherId,
      body: input.body,
    });

    return NextResponse.json({ success: true, message }, { status: 201 });
  } catch (error) {
    if (error instanceof ChatError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Teacher chat messages POST error:", error);

    return NextResponse.json(
      { error: "Failed to send message." },
      { status: 500 },
    );
  }
}
