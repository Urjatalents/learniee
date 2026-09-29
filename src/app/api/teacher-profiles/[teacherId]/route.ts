import { NextResponse } from "next/server";

import { requireCognitoAuth } from "@/lib/api-auth";
import { getTeacherPublicProfile } from "@/features/teacher-profile/server/teacherPublicProfile.service";

/**
 * GET /api/teacher-profiles/[teacherId]
 *
 * An approved Teacher's profile and approved courses, for any signed-in
 * Parent or Teacher (the blog "Visit teacher profile" button). Read-only and
 * limited to the allow-listed fields in getTeacherPublicProfile().
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ teacherId: string }> },
) {
  try {
    const auth = requireCognitoAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    const { teacherId } = await params;
    const profile = await getTeacherPublicProfile(teacherId);

    if (!profile) {
      return NextResponse.json({ error: "Teacher not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, ...profile });
  } catch (error) {
    console.error("Teacher profile GET error:", error);

    return NextResponse.json({ error: "Failed to load the teacher profile." }, { status: 500 });
  }
}
