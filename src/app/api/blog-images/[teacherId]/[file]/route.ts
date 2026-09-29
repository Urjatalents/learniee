import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

import { S3_BUCKET, UPLOAD_FOLDERS, s3Client } from "@/lib/s3";
import {
  BLOG_IMAGE_FILE_RE,
  BLOG_IMAGE_OWNER_RE,
} from "@/features/blog/utils/blogImages";

// Refuse to stream anything bigger than the editor allows (belt and braces:
// a presigned PUT cannot enforce a size limit by itself).
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * GET — public blog images. The S3 bucket stays private; this route reads
 * only from the `blog-images/` folder (the key is rebuilt from validated
 * params, never taken from the client) and serves the bytes with a long
 * immutable cache, since every file name is a fresh UUID.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ teacherId: string; file: string }> },
) {
  const { teacherId, file } = await params;

  if (!BLOG_IMAGE_OWNER_RE.test(teacherId) || !BLOG_IMAGE_FILE_RE.test(file)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const object = await s3Client.send(
      new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: `${UPLOAD_FOLDERS.BLOG_IMAGES}/${teacherId}/${file}`,
      }),
    );

    if (!object.Body || (object.ContentLength ?? 0) > MAX_BYTES) {
      return new NextResponse("Not found", { status: 404 });
    }

    const headers: Record<string, string> = {
      // Fixed by extension, never trusted from S3 metadata.
      "Content-Type": file.endsWith(".png") ? "image/png" : "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    };

    if (object.ContentLength) headers["Content-Length"] = String(object.ContentLength);

    return new Response(object.Body.transformToWebStream(), { headers });
  } catch (error) {
    if (error instanceof Error && (error.name === "NoSuchKey" || error.name === "NotFound")) {
      return new NextResponse("Not found", { status: 404 });
    }

    console.error("Blog image GET error:", error);

    return new NextResponse("Failed to load image", { status: 502 });
  }
}
