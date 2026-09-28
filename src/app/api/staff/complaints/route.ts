import { NextResponse } from "next/server";
import { ComplaintDepartment } from "@prisma/client";

import { requireComplaintStaff } from "@/lib/verifyAdmin";
import {
  listComplaintsForAdmin,
  listComplaintsForDepartment,
} from "@/features/shared/server/complaint.service";

/**
 * GET — complaints for the signed-in staff role.
 * Admin: every complaint. Accounts / HR / IT: only their own department's.
 * The scope comes from the verified token, never from the request.
 */
export async function GET() {
  try {
    const auth = await requireComplaintStaff();

    if (!auth) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const complaints =
      auth.scope === "ALL"
        ? await listComplaintsForAdmin()
        : await listComplaintsForDepartment(ComplaintDepartment[auth.scope]);

    return NextResponse.json({ success: true, complaints });
  } catch (error) {
    console.error("Staff complaints GET error:", error);

    return NextResponse.json({ error: "Failed to fetch complaints." }, { status: 500 });
  }
}
