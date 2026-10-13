import { NextResponse } from "next/server";

import { requireVerifiedAdminAuth } from "@/lib/verifiedAdminAuth";
import {
  respondToComplaint,
  ComplaintError,
} from "@/features/shared/server/complaint.service";
import { logActivity, actorFromTokenPayload } from "@/features/shared/server/activityLog.service";

/**
 * PATCH { status: "IN_PROGRESS" | "RESOLVED" | "CLOSED", adminNote? }
 *
 * Admin is the only responder — moves a complaint along the status
 * ladder. Unlike LeaveRequest's one-shot approve/reject, this can
 * be called more than once per complaint (OPEN -> IN_PROGRESS ->
 * RESOLVED) as long as it isn't already RESOLVED/CLOSED.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ complaintId: string }> },
) {
  try {
    const { complaintId } = await params;

    if (!complaintId) {
      return NextResponse.json(
        { error: "Complaint ID is required." },
        { status: 400 },
      );
    }

    const auth = await requireVerifiedAdminAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    const body = await req.json().catch(() => ({}));
    const { status } = body;

    if (status !== "IN_PROGRESS" && status !== "RESOLVED" && status !== "CLOSED") {
      return NextResponse.json(
        { error: "status must be IN_PROGRESS, RESOLVED, or CLOSED." },
        { status: 400 },
      );
    }

    const complaint = await respondToComplaint({
      complaintId,
      status,
      adminNote: body?.adminNote,
    });

    await logActivity({
      action: "COMPLAINT_STATUS_UPDATED",
      actorRole: "ADMIN",
      ...actorFromTokenPayload(auth.payload),
      description: `Complaint "${complaint.subject}" marked ${status}.`,
      metadata: { complaintId: complaint.id, status },
    });

    return NextResponse.json({ success: true, complaint });
  } catch (error) {
    if (error instanceof ComplaintError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Admin complaint PATCH error:", error);

    return NextResponse.json(
      { error: "Failed to update this complaint." },
      { status: 500 },
    );
  }
}
