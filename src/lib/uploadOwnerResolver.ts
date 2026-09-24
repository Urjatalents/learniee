import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCognitoAuth } from "@/lib/api-auth";
import { UPLOAD_FOLDERS, type UploadFolder } from "@/lib/s3";

type OwnerResolution = { ownerId: string } | { error: NextResponse };

/**
 * Resolves the S3 "owner" ID (used to scope the upload key) for a
 * presigned-upload request, based on the caller's verified Cognito
 * session — never from client-supplied input.
 *
 * TEACHER_DOCUMENTS and COURSE_MEDIA both resolve to the requesting
 * Teacher's id via an identical lookup; this used to be two
 * copy-pasted blocks in presign/route.ts. CHILD_PHOTOS resolves to
 * the requesting Parent's id. HOMEWORK is used by both roles (Teacher
 * attaching reference material, Parent uploading a submission) so it
 * checks the token's own `custom:role` claim rather than assuming —
 * ownership of the specific Homework/Enrollment row is still enforced
 * separately in homework.service.ts, this only decides whose id the
 * S3 key is namespaced under. RESOURCES is Teacher-only (Resource
 * Library, Sep 24, 2026) — a Parent never uploads a resource, only
 * views one — so it always resolves to the Teacher, same as
 * TEACHER_DOCUMENTS/COURSE_MEDIA; ownership of the specific
 * Enrollment is still enforced separately in resource.service.ts.
 */
export async function resolveUploadOwnerId(
  folder: UploadFolder,
  req: NextRequest,
): Promise<OwnerResolution> {
  const auth = requireCognitoAuth(req);
  if ("error" in auth) {
    return { error: auth.error };
  }

  const resolvesToTeacher =
    folder === UPLOAD_FOLDERS.TEACHER_DOCUMENTS ||
    folder === UPLOAD_FOLDERS.COURSE_MEDIA ||
    folder === UPLOAD_FOLDERS.RESOURCES ||
    (folder === UPLOAD_FOLDERS.HOMEWORK && auth.payload["custom:role"] === "teacher");

  if (resolvesToTeacher) {
    const teacher = await prisma.teacher.findUnique({
      where: { cognitoId: auth.payload.sub },
      select: { id: true },
    });

    if (!teacher) {
      return {
        error: NextResponse.json({ error: "Teacher not found" }, { status: 404 }),
      };
    }

    return { ownerId: teacher.id };
  }

  // CHILD_PHOTOS, and HOMEWORK submissions: parent is identified
  // through Cognito auth, not client input.
  const parent = await prisma.parentProfile.findUnique({
    where: { cognitoSub: auth.payload.sub },
  });

  if (!parent) {
    return {
      error: NextResponse.json({ error: "Complete step 1 first" }, { status: 400 }),
    };
  }

  return { ownerId: parent.id };
}
