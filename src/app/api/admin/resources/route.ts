import { NextResponse } from "next/server";

import { requireAdminAuth } from "@/lib/api-auth";
import { createPresignedDownloadUrl } from "@/lib/s3";
import { listResourcesForAdmin } from "@/features/shared/server/resource.service";

/**
 * GET ?teacherId=&parentId=&studentId=
 *
 * Every resource on the platform, newest first, with who shared it
 * (Teacher) and who it belongs to (Parent/Student) — Admin's
 * oversight view, same reasoning as Chat oversight and
 * teacher-strikes. Read-only and not money-adjacent, so it uses the
 * same decode-only Admin auth as the other Admin listing routes
 * (06-OPEN-DECISIONS.md #21).
 */
export async function GET(req: Request) {
  try {
    const auth = requireAdminAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    const url = new URL(req.url);
    const resources = await listResourcesForAdmin({
      teacherId: url.searchParams.get("teacherId")?.trim() || undefined,
      parentId: url.searchParams.get("parentId")?.trim() || undefined,
      studentId: url.searchParams.get("studentId")?.trim() || undefined,
    });

    const withUrls = await Promise.all(
      resources.map(async (r) => ({
        ...r,
        fileUrl: r.fileKey ? await createPresignedDownloadUrl(r.fileKey) : null,
      })),
    );

    return NextResponse.json({ success: true, resources: withUrls });
  } catch (error) {
    console.error("Admin resources GET error:", error);

    return NextResponse.json({ error: "Failed to fetch resources." }, { status: 500 });
  }
}
