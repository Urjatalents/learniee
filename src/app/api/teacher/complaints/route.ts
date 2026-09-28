import { NextResponse } from "next/server";
import { ComplainantRole } from "@prisma/client";

import { requireTeacherId } from "@/features/teacher/server/auth";
import {
  createComplaint,
  listComplaintsForRaiser,
  ComplaintError,
} from "@/features/shared/server/complaint.service";

/** GET — every complaint this Teacher has raised, newest first. */
export async function GET(req: Request) {
  try {
    const teacher = await requireTeacherId(req);
    if ("error" in teacher) {
      return teacher.error;
    }

    const complaints = await listComplaintsForRaiser(teacher.teacherId, ComplainantRole.TEACHER);

    return NextResponse.json({ success: true, complaints });
  } catch (error) {
    console.error("Teacher complaints GET error:", error);

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
    const teacher = await requireTeacherId(req);
    if ("error" in teacher) {
      return teacher.error;
    }

    const body = await req.json().catch(() => ({}));

    const complaint = await createComplaint({
      raiserId: teacher.teacherId,
      raiserRole: ComplainantRole.TEACHER,
      subject: body?.subject,
      description: body?.description,
      department: body?.department,
    });

    return NextResponse.json({ success: true, complaint });
  } catch (error) {
    if (error instanceof ComplaintError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Teacher complaints POST error:", error);

    return NextResponse.json(
      { error: "Failed to submit complaint." },
      { status: 500 },
    );
  }
}
