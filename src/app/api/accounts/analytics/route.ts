import { NextResponse } from "next/server";

import { requireAdminOrAccounts } from "@/lib/verifyAdmin";
import { getAccountsAnalytics } from "@/features/shared/server/accountsAnalytics.service";

/**
 * GET — pie-chart aggregates (Expense Distribution + Profit & Loss)
 * for the Accounts/Admin "Analytics" tab. Restricted to Admin and
 * Accounts logins, same guard as every other money-adjacent Accounts
 * route (06-OPEN-DECISIONS.md #21).
 */
export async function GET() {
  const auth = await requireAdminOrAccounts();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const analytics = await getAccountsAnalytics();
    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Accounts analytics GET error:", error);
    return NextResponse.json({ error: "Failed to load analytics." }, { status: 500 });
  }
}
