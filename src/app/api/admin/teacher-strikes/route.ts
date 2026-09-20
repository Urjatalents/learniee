import { NextResponse } from "next/server";

import { requireAdminAuth } from "@/lib/api-auth";
import { listTeacherStrikes } from "@/features/shared/server/teacherStrike.service";

/**
 * GET — teacher strikes (teacher no-shows and teacher cancellations
 * on cycle sessions), newest first, for Admin. Optional
 * `?teacherId=` narrows it to one teacher. Read-only and not
 * money-adjacent, so it uses the same decode-only Admin auth as the
 * other Admin listing routes (06-OPEN-DECISIONS.md #21).
 */
export async function GET(req: Request) {
  try {
    const auth = requireAdminAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    const teacherId = new URL(req.url).searchParams.get("teacherId")?.trim() || undefined;
    const strikes = await listTeacherStrikes(teacherId);

    return NextResponse.json({ success: true, strikes });
  } catch (error) {
    console.error("Admin teacher strikes error:", error);

    return NextResponse.json({ error: "Failed to fetch teacher strikes" }, { status: 500 });
  }
}
