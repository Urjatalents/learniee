import { NextRequest, NextResponse } from "next/server";

import { requireIt } from "@/lib/verifyAdmin";
import { actorFromTokenPayload } from "@/features/shared/server/activityLog.service";
import {
  listManagedAccounts,
  updateAccountAccess,
  AccountAccessError,
} from "@/features/shared/server/accountAccess.service";

/**
 * Account Access (Sep 23, 2026), IT scope — Teacher and Parent
 * accounts only (confirmed by Aman, Sep 23, 2026). The Teacher/Parent
 * restriction is enforced inside updateAccountAccess() itself, not
 * just by what listManagedAccounts("teacher-parent") returns here, so
 * a crafted request naming another role is still rejected server-side.
 * Signature-verified (`requireIt`), matching the Admin sibling at
 * src/app/api/admin/account-access/route.ts.
 */

export async function GET() {
  const it = await requireIt();
  if (!it) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await listManagedAccounts("teacher-parent");
  return NextResponse.json({ accounts });
}

export async function PATCH(req: NextRequest) {
  const it = await requireIt();
  if (!it) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  try {
    const result = await updateAccountAccess({
      scope: "teacher-parent",
      actorRole: "it",
      actor: actorFromTokenPayload({
        sub: String(it.sub),
        email: typeof it.email === "string" ? it.email : undefined,
        given_name: typeof it.given_name === "string" ? it.given_name : undefined,
        family_name: typeof it.family_name === "string" ? it.family_name : undefined,
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
    console.error("it account-access PATCH failed:", err);
    return NextResponse.json({ error: "Failed to update the account." }, { status: 500 });
  }
}
