import { NextResponse } from "next/server";
import { ActivityActorRole, ComplaintDepartment } from "@prisma/client";

import { requireComplaintStaff } from "@/lib/verifyAdmin";
import {
  respondToComplaint,
  ComplaintError,
} from "@/features/shared/server/complaint.service";
import { logActivity, actorFromTokenPayload } from "@/features/shared/server/activityLog.service";

const ACTOR_ROLE_BY_TOKEN_ROLE: Record<string, ActivityActorRole> = {
  admin: ActivityActorRole.ADMIN,
  accounts: ActivityActorRole.ACCOUNTS,
  hr: ActivityActorRole.HR,
  it: ActivityActorRole.IT,
};

/**
 * PATCH { status: "IN_PROGRESS" | "RESOLVED" | "CLOSED", adminNote? }
 *
 * Department staff can only act on their own department's complaints
 * (anything else is a 404). Admin can act on any complaint.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ complaintId: string }> },
) {
  try {
    const { complaintId } = await params;

    if (!complaintId) {
      return NextResponse.json({ error: "Complaint ID is required." }, { status: 400 });
    }

    const auth = await requireComplaintStaff();

    if (!auth) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
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
      scopeDepartment: auth.scope === "ALL" ? undefined : ComplaintDepartment[auth.scope],
      status,
      adminNote: body?.adminNote,
    });

    await logActivity({
      action: "COMPLAINT_STATUS_UPDATED",
      actorRole: ACTOR_ROLE_BY_TOKEN_ROLE[auth.role] ?? ActivityActorRole.ADMIN,
      ...actorFromTokenPayload(auth.payload),
      description: `Complaint "${complaint.subject}" marked ${status}.`,
      metadata: { complaintId: complaint.id, status },
    });

    return NextResponse.json({ success: true, complaint });
  } catch (error) {
    if (error instanceof ComplaintError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Staff complaint PATCH error:", error);

    return NextResponse.json({ error: "Failed to update this complaint." }, { status: 500 });
  }
}
