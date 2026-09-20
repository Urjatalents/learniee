import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/verifyAdmin";
import { actorFromTokenPayload } from "@/features/shared/server/activityLog.service";
import {
  applySessionDecision,
  SessionReviewError,
} from "@/features/shared/server/sessionReview.service";

/**
 * POST { status, expectedStatus, reason } — Admin decides (or later
 * overrides) a class's outcome. `reason` is mandatory. `expectedStatus`
 * is the status Admin was looking at; a stale page gets a 409.
 * `status` equal to the current outcome means "the outcome stands"
 * (rejecting a parent's report).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required." }, { status: 400 });
    }

    const admin = await requireAdmin();

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    if (
      typeof body?.status !== "string" ||
      typeof body?.expectedStatus !== "string" ||
      typeof body?.reason !== "string"
    ) {
      return NextResponse.json(
        { error: "status, expectedStatus and reason are required." },
        { status: 400 },
      );
    }

    const actor = actorFromTokenPayload({
      sub: admin.sub as string,
      email: admin.email as string | undefined,
      given_name: admin.given_name as string | undefined,
      family_name: admin.family_name as string | undefined,
    });

    const result = await applySessionDecision({
      sessionId,
      toStatus: body.status,
      expectedStatus: body.expectedStatus,
      reason: body.reason,
      admin: { sub: actor.actorId, name: actor.actorName, email: actor.actorEmail },
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof SessionReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Admin session-reviews POST error:", error);

    return NextResponse.json({ error: "Failed to save this decision." }, { status: 500 });
  }
}
