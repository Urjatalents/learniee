import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/verifyAdmin";
import {
  adminApproveEnrollment,
  adminRejectEnrollment,
  EnrollmentApprovalError,
} from "@/features/shared/server/enrollmentApproval.service";
import { logActivity, actorFromTokenPayload } from "@/features/shared/server/activityLog.service";

/**
 * PATCH
 *
 * body: { action: "APPROVE" } -> enrollment goes ACTIVE, lectures
 *   can be scheduled as agreed.
 * body: { action: "REJECT", reason? } -> terminal REJECTED, per
 *   direct instruction this does NOT bounce back to the Teacher
 *   even though the Teacher already approved it.
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

    // Signature-verified (not decode-only): approving an enrollment
    // activates a paid class, so a forged admin token must not pass.
    const admin = await requireAdmin();

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    let enrollment;

    if (action === "APPROVE") {
      enrollment = await adminApproveEnrollment(enrollmentId);
    } else if (action === "REJECT") {
      enrollment = await adminRejectEnrollment(enrollmentId, body.reason);
    } else {
      return NextResponse.json(
        { error: "action must be APPROVE or REJECT." },
        { status: 400 },
      );
    }

    await logActivity({
      action: action === "APPROVE" ? "ENROLLMENT_ADMIN_APPROVED" : "ENROLLMENT_REJECTED",
      actorRole: "ADMIN",
      ...actorFromTokenPayload({
        sub: admin.sub,
        email: admin.email as string | undefined,
        given_name: admin.given_name as string | undefined,
        family_name: admin.family_name as string | undefined,
      }),
      description: `Admin ${action === "APPROVE" ? "approved" : "rejected"} enrollment ${enrollmentId}.`,
      metadata: { enrollmentId, reason: action === "REJECT" ? body.reason : undefined },
    });

    return NextResponse.json({ success: true, enrollment });
  } catch (error) {
    if (error instanceof EnrollmentApprovalError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Admin enrollment approval PATCH error:", error);

    return NextResponse.json(
      { error: "Failed to update this enrollment." },
      { status: 500 },
    );
  }
}
