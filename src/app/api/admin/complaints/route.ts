import { NextResponse } from "next/server";

import { requireVerifiedAdminAuth } from "@/lib/verifiedAdminAuth";
import { listComplaintsForAdmin } from "@/features/shared/server/complaint.service";

/** GET — every complaint across Parent + Teacher, newest first. */
export async function GET(req: Request) {
  try {
    const auth = await requireVerifiedAdminAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    const complaints = await listComplaintsForAdmin();

    return NextResponse.json({ success: true, complaints });
  } catch (error) {
    console.error("Admin complaints GET error:", error);

    return NextResponse.json(
      { error: "Failed to fetch complaints." },
      { status: 500 },
    );
  }
}
