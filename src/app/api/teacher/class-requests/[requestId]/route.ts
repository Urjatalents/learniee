import { NextResponse } from "next/server";

import { requireTeacherId } from "@/features/teacher/server/auth";
import {
  ClassRequestError,
  getAcceptedVacancyForListing,
  respondToVacancy,
} from "@/features/shared/server/classRequest.service";

/** GET — an accepted vacancy that still needs a course listing (prefills the new-course form). */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  try {
    const { requestId } = await params;

    const teacher = await requireTeacherId(req);
    if ("error" in teacher) return teacher.error;

    const vacancy = await getAcceptedVacancyForListing(teacher.teacherId, requestId);

    return NextResponse.json({ success: true, vacancy });
  } catch (error) {
    if (error instanceof ClassRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Teacher class-request GET error:", error);

    return NextResponse.json({ error: "Failed to load this vacancy." }, { status: 500 });
  }
}

/** PATCH { decision: "ACCEPT" | "DECLINE", note? } — final; one response per Teacher per vacancy. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  try {
    const { requestId } = await params;

    const teacher = await requireTeacherId(req);
    if ("error" in teacher) return teacher.error;

    const body = await req.json().catch(() => ({}));
    const decision = body?.decision;

    if (decision !== "ACCEPT" && decision !== "DECLINE") {
      return NextResponse.json({ error: "decision must be ACCEPT or DECLINE." }, { status: 400 });
    }

    await respondToVacancy({
      teacherId: teacher.teacherId,
      requestId,
      decision,
      note: body?.note,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ClassRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Teacher class-request PATCH error:", error);

    return NextResponse.json({ error: "Failed to save your response." }, { status: 500 });
  }
}
