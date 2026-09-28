import { NextResponse } from "next/server";
import { ComplainantRole } from "@prisma/client";

import { requireParentId } from "@/features/parent/server/auth";
import {
  createComplaint,
  listComplaintsForRaiser,
  ComplaintError,
} from "@/features/shared/server/complaint.service";

/** GET — every complaint this Parent has raised, newest first. */
export async function GET(req: Request) {
  try {
    const parent = await requireParentId(req);
    if ("error" in parent) {
      return parent.error;
    }

    const complaints = await listComplaintsForRaiser(parent.parentId, ComplainantRole.PARENT);

    return NextResponse.json({ success: true, complaints });
  } catch (error) {
    console.error("Parent complaints GET error:", error);

    return NextResponse.json(
      { error: "Failed to load complaints." },
      { status: 500 },
    );
  }
}

/**
 * POST { subject, description, department }
 *
 * Raises a new complaint — OPEN until Admin responds
 * (`/admin/complaints`).
 */
export async function POST(req: Request) {
  try {
    const parent = await requireParentId(req);
    if ("error" in parent) {
      return parent.error;
    }

    const body = await req.json().catch(() => ({}));

    const complaint = await createComplaint({
      raiserId: parent.parentId,
      raiserRole: ComplainantRole.PARENT,
      subject: body?.subject,
      description: body?.description,
      department: body?.department,
    });

    return NextResponse.json({ success: true, complaint });
  } catch (error) {
    if (error instanceof ComplaintError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Parent complaints POST error:", error);

    return NextResponse.json(
      { error: "Failed to submit complaint." },
      { status: 500 },
    );
  }
}
