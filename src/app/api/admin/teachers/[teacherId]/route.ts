import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/api-auth";
import { createPresignedDownloadUrl } from "@/lib/s3";

/**
 * GET /api/admin/teachers/[teacherId]
 *
 * Full application for one teacher (personal + professional info + every
 * uploaded file). The S3 bucket is private, so each file gets a short-lived
 * signed `viewUrl` the Admin's browser can open.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ teacherId: string }> },
) {
  try {
    const auth = requireAdminAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    const { teacherId } = await params;

    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: {
        professionalInfo: true,
        files: true,
      },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    const files = await Promise.all(
      teacher.files.map(async (file) => ({
        id: file.id,
        type: file.type,
        s3Key: file.s3Key,
        originalFileName: file.originalFileName,
        mimeType: file.mimeType,
        fileSize: file.fileSize,
        viewUrl: await createPresignedDownloadUrl(file.s3Key),
      })),
    );

    return NextResponse.json({
      success: true,
      teacher: { ...teacher, files },
    });
  } catch (error) {
    console.error("Admin teacher detail error:", error);

    return NextResponse.json(
      { error: "Failed to fetch teacher" },
      { status: 500 },
    );
  }
}
