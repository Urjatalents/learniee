import { NextResponse } from "next/server";

import { requireVerifiedAdminAuth } from "@/lib/verifiedAdminAuth";
import { getChatRoomsForAdmin } from "@/features/chat/server/chat.service";

/**
 * GET ?teacherId=&parentId=&courseId=
 *
 * Lists every chat room on the platform, optionally narrowed to a
 * specific teacher, parent, and/or course — Admin's moderation
 * queue. No ownership filtering: Admin is meant to see all of it.
 */
export async function GET(req: Request) {
  try {
    const admin = await requireVerifiedAdminAuth(req);

    if ("error" in admin) {
      return admin.error;
    }

    const url = new URL(req.url);
    const rooms = await getChatRoomsForAdmin({
      teacherId: url.searchParams.get("teacherId") || undefined,
      parentId: url.searchParams.get("parentId") || undefined,
      courseId: url.searchParams.get("courseId") || undefined,
    });

    return NextResponse.json({ success: true, rooms });
  } catch (error) {
    console.error("Admin chat rooms GET error:", error);

    return NextResponse.json(
      { error: "Failed to load chat rooms." },
      { status: 500 },
    );
  }
}
