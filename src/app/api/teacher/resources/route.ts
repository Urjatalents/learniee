import { NextResponse } from "next/server";

import { requireTeacherId } from "@/features/teacher/server/auth";
import { createPresignedDownloadUrl } from "@/lib/s3";
import {
  ResourceError,
  createResource,
  listResourcesForTeacherEnrollment,
} from "@/features/shared/server/resource.service";

/**
 * GET ?enrollmentId=<id>
 *
 * Lists resources shared on this enrollment, newest first — each
 * file resource comes with a short-lived download URL.
 */
export async function GET(req: Request) {
  try {
    const teacher = await requireTeacherId(req);

    if ("error" in teacher) {
      return teacher.error;
    }

    const enrollmentId = new URL(req.url).searchParams.get("enrollmentId");

    if (!enrollmentId) {
      return NextResponse.json({ error: "enrollmentId is required." }, { status: 400 });
    }

    const resources = await listResourcesForTeacherEnrollment(enrollmentId, teacher.teacherId);

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

    console.error("Teacher resources GET error:", error);

    return NextResponse.json({ error: "Failed to load resources." }, { status: 500 });
  }
}

/**
 * POST { enrollmentId, title, description?, type, fileKey?, fileName?, externalUrl? }
 *
 * Shares a new resource (file or link) onto an enrollment.
 */
export async function POST(req: Request) {
  try {
    const teacher = await requireTeacherId(req);

    if ("error" in teacher) {
      return teacher.error;
    }

    const input = await req.json();

    if (!input.enrollmentId || typeof input.enrollmentId !== "string") {
      return NextResponse.json({ error: "enrollmentId is required." }, { status: 400 });
    }

    const resource = await createResource(teacher.teacherId, {
      enrollmentId: input.enrollmentId,
      title: input.title,
      description: input.description,
      type: input.type === "LINK" ? "LINK" : "FILE",
      fileKey: input.fileKey,
      fileName: input.fileName,
      externalUrl: input.externalUrl,
    });

    return NextResponse.json({ success: true, resource }, { status: 201 });
  } catch (error) {
    if (error instanceof ResourceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Teacher resources POST error:", error);

    return NextResponse.json({ error: "Failed to share resource." }, { status: 500 });
  }
}
