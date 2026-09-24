import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";
import { createPresignedDownloadUrl } from "@/lib/s3";
import {
  ResourceError,
  listResourcesForParent,
  listResourcesForParentEnrollment,
} from "@/features/shared/server/resource.service";

/**
 * GET, or GET ?enrollmentId=<id>
 *
 * Without enrollmentId: every resource ever shared with this Parent,
 * across every enrollment, newest first — backs the standalone
 * /parent/resources page. With enrollmentId: scoped to one
 * enrollment — backs the Resources tab on that course's My Classes
 * page. Resources never disappear when an enrollment ends, so this
 * is never filtered by enrollment status.
 */
export async function GET(req: Request) {
  try {
    const parent = await requireParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    const enrollmentId = new URL(req.url).searchParams.get("enrollmentId");

    const resources = enrollmentId
      ? await listResourcesForParentEnrollment(enrollmentId, parent.parentId)
      : await listResourcesForParent(parent.parentId);

    const withUrls = await Promise.all(
      resources.map(async (r) => ({
        ...r,
        fileUrl: r.fileKey ? await createPresignedDownloadUrl(r.fileKey) : null,
      })),
    );

    return NextResponse.json({ success: true, resources: withUrls });
  } catch (error) {
    if (error instanceof ResourceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Parent resources GET error:", error);

    return NextResponse.json({ error: "Failed to load resources." }, { status: 500 });
  }
}
