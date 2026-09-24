import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

/**
 * Dedicated S3 client, using its own IAM user's credentials
 * (AWS_S3_ACCESS_KEY_ID / AWS_S3_SECRET_ACCESS_KEY) rather than the
 * shared default AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY, which
 * cognitoAdmin.ts relies on. Keeping these separate means the S3
 * upload IAM user only ever needs S3 permissions, and Cognito
 * keeps using its own separate identity.
 */
export const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY as string,
  },
});

export const S3_BUCKET = process.env.AWS_S3_BUCKET_NAME as string;

/**
 * The only folders the presign endpoint is allowed to issue
 * upload URLs for. Keeping this as an explicit allow-list stops
 * callers from writing to arbitrary paths in the bucket.
 */
export const UPLOAD_FOLDERS = {
  TEACHER_DOCUMENTS: "teacher-documents",
  CHILD_PHOTOS: "child-photos",
  COURSE_MEDIA: "course-media",
  HOMEWORK: "homework",
  RESOURCES: "resources",
} as const;

export type UploadFolder =
  (typeof UPLOAD_FOLDERS)[keyof typeof UPLOAD_FOLDERS];

export const ALLOWED_UPLOAD_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "application/pdf",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  // Added for homework attachments/submissions (worksheets, typed
  // answers) — every other allowed type above was already image/
  // video/PDF only, none of which fit a plain-text or Word homework
  // file.
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // Added for the Resource Library (Sep 24, 2026) — a Teacher can
  // share "anything" with a Student, so the allow-list grows to
  // cover the other common study-material formats beyond
  // worksheets/PDFs: slides, spreadsheets, zipped bundles, audio.
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.ms-excel",
  "application/zip",
  "audio/mpeg",
  "audio/mp4",
] as const;

/**
 * Builds a namespaced, unguessable object key. We never trust the
 * client-supplied file name for the key itself (only for the
 * extension), which avoids path traversal / overwrite issues.
 */
export function buildS3Key(folder: UploadFolder, ownerId: string, originalFileName: string) {
  const extMatch = originalFileName.match(/\.[a-zA-Z0-9]+$/);
  const ext = extMatch ? extMatch[0].toLowerCase() : "";
  return `${folder}/${ownerId}/${randomUUID()}${ext}`;
}

/**
 * Returns a short-lived URL the browser can PUT the file bytes to
 * directly. This keeps large files (up to 50MB) off the Next.js
 * server entirely, avoiding request body size limits on the
 * hosting platform.
 */
export async function createPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds = 300
) {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
}

/**
 * The bucket should stay fully private (no public read). Anything
 * that needs to display or download an uploaded file - the admin
 * review screen for teacher documents, or a parent viewing their
 * child's photo - should call this to get a short-lived GET URL
 * rather than relying on a public bucket URL.
 */
export async function createPresignedDownloadUrl(
  key: string,
  expiresInSeconds = 900
) {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
}