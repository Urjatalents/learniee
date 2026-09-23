import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/verifyAdmin";
import { actorFromTokenPayload } from "@/features/shared/server/activityLog.service";
import {
  listManagedAccounts,
  updateAccountAccess,
  AccountAccessError,
} from "@/features/shared/server/accountAccess.service";

/**
 * Account Access (Sep 23, 2026), Admin scope — every account type
 * (Parent, Teacher, Accounts, HR, IT, other Admins). See
 * accountAccess.service.ts for the shared logic and
 * src/app/api/it/account-access/route.ts for the IT-scoped sibling.
 * Signature-verified (`requireAdmin`), not decode-only — this
 * touches login credentials, so it belongs on the verified list
 * (06-OPEN-DECISIONS.md #21) from day one.
 */

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await listManagedAccounts("all");
  return NextResponse.json({ accounts });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  try {
    const result = await updateAccountAccess({
      scope: "all",
      actorRole: "admin",
      actor: actorFromTokenPayload({
        sub: String(admin.sub),
        email: typeof admin.email === "string" ? admin.email : undefined,
        given_name: typeof admin.given_name === "string" ? admin.given_name : undefined,
        family_name: typeof admin.family_name === "string" ? admin.family_name : undefined,
      }),
      targetRole: body.targetRole,
      targetEmail: body.targetEmail,
      newPassword: body.newPassword || undefined,
      passwordPermanent:
        typeof body.passwordPermanent === "boolean" ? body.passwordPermanent : undefined,
      newEmail: body.newEmail || undefined,
      newPhone: body.newPhone || undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AccountAccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("admin account-access PATCH failed:", err);
    return NextResponse.json({ error: "Failed to update the account." }, { status: 500 });
  }
}
