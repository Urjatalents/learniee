import { NextResponse } from "next/server";

import { requireVerifiedAdminAuth } from "@/lib/verifiedAdminAuth";
import { listActivityLogs } from "@/features/shared/server/activityLog.service";
import { ActivityAction, ActivityActorRole } from "@prisma/client";

/**
 * GET — paginated, filterable Activity Log feed for the admin
 * `/admin/activity-logs` page.
 *
 * Query params (all optional): page, pageSize, action, actorRole,
 * q (free-text search), from, to (ISO date/datetime strings —
 * date-only values like "2026-09-01" are treated as that whole day
 * in `to`'s case, see below).
 */
export async function GET(req: Request) {
  const auth = await requireVerifiedAdminAuth(req);

  if ("error" in auth) {
    return auth.error;
  }

  try {
    const { searchParams } = new URL(req.url);

    const page = Number(searchParams.get("page") ?? "1") || 1;
    const pageSize = Number(searchParams.get("pageSize") ?? "50") || 50;

    const actionParam = searchParams.get("action");
    const actorRoleParam = searchParams.get("actorRole");
    const q = searchParams.get("q") ?? undefined;
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const action =
      actionParam && actionParam in ActivityAction
        ? (actionParam as ActivityAction)
        : undefined;

    const actorRole =
      actorRoleParam && actorRoleParam in ActivityActorRole
        ? (actorRoleParam as ActivityActorRole)
        : undefined;

    const from = fromParam ? new Date(fromParam) : undefined;
    // A date-only "to" value (from a <input type="date">) should
    // include that entire day, not stop at 00:00:00 of it.
    const to = toParam
      ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(toParam) ? `${toParam}T23:59:59.999` : toParam)
      : undefined;

    const result = await listActivityLogs(
      {
        action,
        actorRole,
        q,
        from: from && !isNaN(from.getTime()) ? from : undefined,
        to: to && !isNaN(to.getTime()) ? to : undefined,
      },
      page,
      pageSize,
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Admin activity-logs GET error:", error);

    return NextResponse.json(
      { error: "Failed to load the activity log." },
      { status: 500 },
    );
  }
}
