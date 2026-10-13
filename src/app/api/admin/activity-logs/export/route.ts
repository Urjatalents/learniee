import { NextResponse } from "next/server";

import { requireVerifiedAdminAuth } from "@/lib/verifiedAdminAuth";
import { buildActivityLogsCsv } from "@/features/shared/server/activityLog.service";
import { ActivityAction, ActivityActorRole } from "@prisma/client";

/**
 * GET — downloads the Activity Log (honoring the same filters as
 * the list view) as a CSV file. Capped at 20,000 rows
 * (`CSV_EXPORT_ROW_CAP` in activityLog.service.ts) — narrow the date
 * range if a export needs more than that.
 */
export async function GET(req: Request) {
  const auth = await requireVerifiedAdminAuth(req);

  if ("error" in auth) {
    return auth.error;
  }

  try {
    const { searchParams } = new URL(req.url);

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
    const to = toParam
      ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(toParam) ? `${toParam}T23:59:59.999` : toParam)
      : undefined;

    const csv = await buildActivityLogsCsv({
      action,
      actorRole,
      q,
      from: from && !isNaN(from.getTime()) ? from : undefined,
      to: to && !isNaN(to.getTime()) ? to : undefined,
    });

    const filename = `learniee-activity-log-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Admin activity-logs export GET error:", error);

    return NextResponse.json(
      { error: "Failed to export the activity log." },
      { status: 500 },
    );
  }
}
