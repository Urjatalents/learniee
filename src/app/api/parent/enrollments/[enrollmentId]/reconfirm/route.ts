import { NextResponse } from "next/server";

import { requireVerifiedParentId } from "@/features/parent/server/verifiedAuth";
import {
  parentConfirmRevision,
  parentDeclineRevision,
  EnrollmentApprovalError,
} from "@/features/shared/server/enrollmentApproval.service";

/**
 * PATCH
 *
 * body: { action: "CONFIRM" } — accepts the Teacher's proposed
 *   cycle/date revision; enrollment moves on to Admin.
 * body: { action: "DECLINE" } — rejects the revision; enrollment is
 *   cancelled. Further discussion happens in the chat room before
 *   deciding, since this is a one-way action.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ enrollmentId: string }> },
) {
  try {
    const { enrollmentId } = await params;

    if (!enrollmentId) {
      return NextResponse.json(
        { error: "Enrollment ID is required." },
        { status: 400 },
      );
    }

    const parent = await requireVerifiedParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    const { action } = await req.json();

    let enrollment;

    if (action === "CONFIRM") {
      enrollment = await parentConfirmRevision(enrollmentId, parent.parentId);
    } else if (action === "DECLINE") {
      enrollment = await parentDeclineRevision(enrollmentId, parent.parentId);
    } else {
      return NextResponse.json(
        { error: "action must be CONFIRM or DECLINE." },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, enrollment });
  } catch (error) {
    if (error instanceof EnrollmentApprovalError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Parent enrollment reconfirm PATCH error:", error);

    return NextResponse.json(
      { error: "Failed to update this enrollment." },
      { status: 500 },
    );
  }
}
