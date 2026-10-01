import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";
import {
  ClassRequestError,
  createClassRequest,
  listClassRequestsForParent,
} from "@/features/shared/server/classRequest.service";

/** GET — every class request this Parent has raised, newest first. */
export async function GET(req: Request) {
  try {
    const parent = await requireParentId(req);
    if ("error" in parent) return parent.error;

    const requests = await listClassRequestsForParent(parent.parentId);

    return NextResponse.json({ success: true, requests });
  } catch (error) {
    console.error("Parent class-requests GET error:", error);

    return NextResponse.json({ error: "Failed to load your requests." }, { status: 500 });
  }
}

/**
 * POST { title, subject, description, studentId?, grade?, board?, language?,
 *        sessionsPerWeek?, preferredSchedule?, budgetPerSession? }
 *
 * Raises a custom class request — PENDING_REVIEW until Admin acts
 * (`/admin/class-requests`).
 */
export async function POST(req: Request) {
  try {
    const parent = await requireParentId(req);
    if ("error" in parent) return parent.error;

    const body = await req.json().catch(() => ({}));
    const request = await createClassRequest(parent.parentId, body ?? {});

    return NextResponse.json({ success: true, request }, { status: 201 });
  } catch (error) {
    if (error instanceof ClassRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Parent class-requests POST error:", error);

    return NextResponse.json({ error: "Failed to submit your request." }, { status: 500 });
  }
}
