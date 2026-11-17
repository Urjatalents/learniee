import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";
import { getParentDashboard } from "@/features/parent/server/dashboard.service";

/**
 * GET — everything the Parent home screen shows, in one response: learners,
 * classes with cycle progress, the next sessions and demos, homework due,
 * recent chats, wallet + free demos, "needs your attention" items and course
 * recommendations. Read-only; every query inside is scoped to the
 * logged-in Parent.
 */
export async function GET(req: Request) {
  try {
    const parent = await requireParentId(req);
    if ("error" in parent) return parent.error;

    const dashboard = await getParentDashboard(parent.parentId);

    return NextResponse.json({ success: true, dashboard });
  } catch (error) {
    console.error("Parent dashboard GET error:", error);

    return NextResponse.json(
      { error: "Failed to load your dashboard." },
      { status: 500 },
    );
  }
}
