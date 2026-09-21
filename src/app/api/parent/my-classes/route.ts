import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";
import { getMyClassesForParent } from "@/features/parent/server/myClasses.service";

/**
 * GET
 *
 * Backs the Parent's "My Classes" list (Part 2C): every enrollment
 * of the logged-in parent — the same rows as `/api/parent/enrollments`
 * — plus, on cycle-model enrollments that use the new page,
 * `classSummary` (cycle progress, next class, classes waiting for
 * "All good" / "Report a problem"). Legacy enrollments carry
 * `classSummary: null` and keep their old view.
 */
export async function GET(req: Request) {
  try {
    const parent = await requireParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    const enrollments = await getMyClassesForParent(parent.parentId);

    return NextResponse.json({ success: true, enrollments });
  } catch (error) {
    console.error("Parent my-classes GET error:", error);

    return NextResponse.json(
      { error: "Failed to load your classes." },
      { status: 500 },
    );
  }
}
