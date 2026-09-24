"use client";

export type UploadFolder =
  | "teacher-documents"
  | "child-photos"
  | "course-media"
  | "homework"
  | "resources";

interface UploadOptions {
  file: File;
  folder: UploadFolder;

  /**
   * Required for the existing teacher onboarding
   * document upload flow.
   */
  teacherId?: string;
}

/**
 * Uploads a file directly to S3 using a presigned URL.
 */
export async function uploadFileToS3({
  file,
  folder,
  teacherId,
}: UploadOptions): Promise<string> {
  const presignRes = await fetch("/api/upload/presign", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      folder,
      fileName: file.name,
      contentType: file.type,

      // Existing teacher onboarding continues
      // to send teacherId.
      ...(teacherId && { teacherId }),
    }),
  });

  if (!presignRes.ok) {
    const data = await presignRes.json().catch(() => ({}));

    throw new Error(
      data.error || "Could not prepare file upload",
    );
  }

  const { uploadUrl, key } =
    await presignRes.json();

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  });

  if (!putRes.ok) {
    throw new Error(
      `Failed to upload ${file.name}`,
    );
  }

  return key as string;
}