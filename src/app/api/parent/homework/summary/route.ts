import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";
import { getOpenHomeworkCounts } from "@/features/parent/server/classListExtras.service";

/**
 * GET
 *
 * `{ counts: { [enrollmentId]: openHomeworkCount } }` for the logged-in
 * parent — drives the "N due" tags on the My Classes > Homework tab.
 */
export async function GET(req: Request) {
  try {
    const parent = await requireParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    const counts = await getOpenHomeworkCounts(parent.parentId);

    return NextResponse.json({ success: true, counts });
  } catch (error) {
    console.error("Parent homework summary GET error:", error);

    return NextResponse.json({ error: "Failed to load homework." }, { status: 500 });
  }
}
