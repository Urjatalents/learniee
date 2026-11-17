import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";
import { getChatPreviewsForParent } from "@/features/parent/server/classListExtras.service";

/**
 * GET
 *
 * The latest message of each of the logged-in parent's chat rooms —
 * drives the message preview on the My Classes > Messages tab.
 */
export async function GET(req: Request) {
  try {
    const parent = await requireParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    const previews = await getChatPreviewsForParent(parent.parentId);

    return NextResponse.json({ success: true, previews });
  } catch (error) {
    console.error("Parent chat previews GET error:", error);

    return NextResponse.json({ error: "Failed to load messages." }, { status: 500 });
  }
}
