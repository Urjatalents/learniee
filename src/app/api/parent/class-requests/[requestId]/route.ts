import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";
import {
  ClassRequestError,
  cancelClassRequestByParent,
} from "@/features/shared/server/classRequest.service";

/** PATCH { action: "CANCEL" } — Parent withdraws a request that hasn't been fulfilled. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  try {
    const { requestId } = await params;

    const parent = await requireParentId(req);
    if ("error" in parent) return parent.error;

    const body = await req.json().catch(() => ({}));

    if (body?.action !== "CANCEL") {
      return NextResponse.json({ error: "action must be CANCEL." }, { status: 400 });
    }

    await cancelClassRequestByParent(parent.parentId, requestId);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ClassRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Parent class-requests PATCH error:", error);

    return NextResponse.json({ error: "Failed to update your request." }, { status: 500 });
  }
}
