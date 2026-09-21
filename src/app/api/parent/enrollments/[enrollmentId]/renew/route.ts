import { NextResponse } from "next/server";

import { requireVerifiedParentId } from "@/features/parent/server/verifiedAuth";
import {
  getRenewalStatus,
  RenewalError,
} from "@/features/parent/server/renewal.service";

/**
 * GET
 *
 * Whether this Enrollment's Renew action is open right now, and — if
 * so — a preview (next month's dates, session count, price) using
 * the Enrollment's current schedule. The client recomputes the same
 * preview locally with `buildCyclePlan` if the parent changes
 * weekdays/time before paying; the server always re-derives the
 * real price at order time regardless.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ enrollmentId: string }> },
) {
  try {
    const parent = await requireVerifiedParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    const { enrollmentId } = await params;
    const status = await getRenewalStatus(enrollmentId, parent.parentId);

    return NextResponse.json({ success: true, ...status });
  } catch (error) {
    if (error instanceof RenewalError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Parent enrollments/renew GET error:", error);

    return NextResponse.json(
      { error: "Failed to load renewal status." },
      { status: 500 },
    );
  }
}
