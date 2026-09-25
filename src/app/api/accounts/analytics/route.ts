import { NextResponse } from "next/server";

import { requireAdminOrAccounts } from "@/lib/verifyAdmin";
import { getAccountsAnalytics } from "@/features/shared/server/accountsAnalytics.service";

/**
 * GET — pie-chart aggregates (Profit & Loss / Expense Distribution /
 * Revenue Breakdown / Payout Status) for the Accounts/Admin
 * "Analytics" tab. Restricted to Admin and Accounts logins, same
 * guard as every other money-adjacent Accounts route
 * (06-OPEN-DECISIONS.md #21).
 *
 * Query params (both optional, same "from"/"to" convention as
 * `/api/admin/activity-logs`): `from`, `to` — ISO date or
 * date-only ("YYYY-MM-DD") strings. A date-only `to` is treated as
 * the whole day (23:59:59.999), not just its midnight instant.
 * Omit both for the previous all-time behavior.
 */
export async function GET(req: Request) {
  const auth = await requireAdminOrAccounts();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const from = fromParam ? new Date(fromParam) : undefined;
    const to = toParam
      ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(toParam) ? `${toParam}T23:59:59.999` : toParam)
      : undefined;

    if (from && isNaN(from.getTime())) {
      return NextResponse.json({ error: "Invalid 'from' date." }, { status: 400 });
    }
    if (to && isNaN(to.getTime())) {
      return NextResponse.json({ error: "Invalid 'to' date." }, { status: 400 });
    }
    if (from && to && from.getTime() > to.getTime()) {
      return NextResponse.json({ error: "'from' must be before 'to'." }, { status: 400 });
    }

    const analytics = await getAccountsAnalytics({ from, to });
    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Accounts analytics GET error:", error);
    return NextResponse.json({ error: "Failed to load analytics." }, { status: 500 });
  }
}
