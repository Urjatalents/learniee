import { NextResponse } from "next/server";

import { requireVerifiedAdminAuth } from "@/lib/verifiedAdminAuth";
import { listLeaveRequestsForAdmin } from "@/features/shared/server/leaveRequest.service";

/** GET — every leave request across every Teacher, newest first (pending + resolved). */
export async function GET(req: Request) {
  try {
    const auth = await requireVerifiedAdminAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    const requests = await listLeaveRequestsForAdmin();

    return NextResponse.json({ success: true, requests });
  } catch (error) {
    console.error("Admin leave-requests GET error:", error);

    return NextResponse.json(
      { error: "Failed to fetch leave requests." },
      { status: 500 },
    );
  }
}
