import { NextResponse } from "next/server";

import { requireCommunityActor } from "@/features/community/server/auth";
import {
  CommunityError,
  listMessages,
  postMessage,
} from "@/features/community/server/community.service";

// Never cache — this is a polled, per-request feed.
export const dynamic = "force-dynamic";

/**
 * GET ?after=<ISO>  → messages created/changed since the cursor (polling)
 * GET ?before=<ISO> → a page of older messages
 * GET               → the most recent page
 *
 * Open to approved Teachers, Admin, Accounts, HR and IT. Never Parents.
 */
export async function GET(req: Request) {
  try {
    const auth = await requireCommunityActor();

    if ("error" in auth) {
      return auth.error;
    }

    const { actor } = auth;
    const url = new URL(req.url);

    const { messages, hasMore } = await listMessages({
      after: url.searchParams.get("after"),
      before: url.searchParams.get("before"),
    });

    return NextResponse.json({
      success: true,
      me: {
        role: actor.role,
        id: actor.id,
        name: actor.name,
        canAnnounce: actor.role === "ADMIN",
        canModerate: actor.role === "ADMIN",
      },
      messages,
      hasMore,
    });
  } catch (error) {
    if (error instanceof CommunityError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Community messages GET error:", error);

    return NextResponse.json({ error: "Failed to load messages." }, { status: 500 });
  }
}

/** POST { body: string, isAnnouncement?: boolean } — announcements are Admin only. */
export async function POST(req: Request) {
  try {
    const auth = await requireCommunityActor();

    if ("error" in auth) {
      return auth.error;
    }

    let input: { body?: unknown; isAnnouncement?: unknown };

    try {
      input = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const message = await postMessage({
      actor: auth.actor,
      body: input.body,
      isAnnouncement: input.isAnnouncement === true,
    });

    return NextResponse.json({ success: true, message }, { status: 201 });
  } catch (error) {
    if (error instanceof CommunityError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Community messages POST error:", error);

    return NextResponse.json({ error: "Failed to send message." }, { status: 500 });
  }
}
