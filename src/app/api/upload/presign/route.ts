import { NextRequest, NextResponse } from "next/server";
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  UPLOAD_FOLDERS,
  type UploadFolder,
  buildS3Key,
  createPresignedUploadUrl,
} from "@/lib/s3";
import { resolveUploadOwnerId } from "@/lib/uploadOwnerResolver";

const FOLDER_VALUES = Object.values(UPLOAD_FOLDERS);

function isUploadFolder(value: unknown): value is UploadFolder {
  return typeof value === "string" && (FOLDER_VALUES as string[]).includes(value);
}

/**
 * Issues a short-lived presigned S3 PUT URL.
 *
 * Supported folders:
 *
 * teacher-documents / course-media
 *   → Requires Cognito auth. Teacher is identified from
 *     auth.payload.sub - the browser's teacherId is not trusted
 *     (see the security fix note in 07-LESSONS-LEARNED.md).
 *
 * child-photos
 *   → Uses the parent's idToken cookie.
 *
 * See lib/uploadOwnerResolver.ts for the actual owner-lookup logic.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { folder, fileName, contentType } = body ?? {};

    if (!isUploadFolder(folder)) {
      return NextResponse.json({ error: "Invalid or missing folder" }, { status: 400 });
    }

    if (!fileName || typeof fileName !== "string") {
      return NextResponse.json({ error: "fileName is required" }, { status: 400 });
    }

    if (!contentType || !ALLOWED_UPLOAD_MIME_TYPES.includes(contentType)) {
      return NextResponse.json(
        {
          error:
            "Unsupported file type. Allowed types are images, PDF, video, Word/Excel/PowerPoint, plain text, zip and audio files.",
        },
        { status: 400 },
      );
    }

    const owner = await resolveUploadOwnerId(folder, req);
    if ("error" in owner) {
      return owner.error;
    }

    const key = buildS3Key(folder, owner.ownerId, fileName);
    const uploadUrl = await createPresignedUploadUrl(key, contentType);

    return NextResponse.json({ uploadUrl, key });
  } catch (error) {
    console.error("Presign upload error:", error);
    return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 });
  }
}
