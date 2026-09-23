import { NextResponse } from "next/server";
import { TeacherFileType } from "@prisma/client";

import { requireCognitoAuth } from "@/lib/api-auth";
import { createPresignedDownloadUrl } from "@/lib/s3";

import {
  getApprovedCourseById,
  getOtherApprovedCoursesByTeacher,
} from "@/features/parent/server/course.service";
import { getTeacherRatingSummary } from "@/features/shared/server/review.service";

type CourseDetailRow = NonNullable<
  Awaited<ReturnType<typeof getApprovedCourseById>>
>;
type OtherCourseRow = Awaited<
  ReturnType<typeof getOtherApprovedCoursesByTeacher>
>[number];

/**
 * GET /api/parent/courses/[courseId]
 *
 * A single course's full detail, plus a short list of other
 * courses by the same teacher. See getApprovedCourseById() for
 * why this is restricted to CourseStatus.APPROVED only — a 404 is
 * returned both when the course doesn't exist and when it exists
 * but isn't approved yet, so the response never reveals which case
 * it is.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const { courseId } = await params;

    const auth = requireCognitoAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    const course = await getApprovedCourseById(courseId);

    if (!course) {
      return NextResponse.json(
        { error: "Course not found." },
        { status: 404 },
      );
    }

    // Rating shown is the teacher's own overall average (see
    // getTeacherRatingSummary) — every "other course by this teacher"
    // shares the same teacherId, so one lookup covers all of them.
    const rating = await getTeacherRatingSummary(course.teacherId);

    const [courseWithMedia, otherCourses] = await Promise.all([
      attachCourseMedia(course, rating),
      getOtherApprovedCoursesByTeacher(course.teacherId, course.id).then(
        (courses) =>
          Promise.all(courses.map((c) => attachThumbnail(c, rating))),
      ),
    ]);

    return NextResponse.json({
      success: true,
      course: courseWithMedia,
      otherCourses,
    });
  } catch (error) {
    console.error("Parent course detail GET error:", error);

    return NextResponse.json(
      { error: "Failed to fetch course." },
      { status: 500 },
    );
  }
}

type TeacherRating = Awaited<ReturnType<typeof getTeacherRatingSummary>>;

/**
 * Resolves the course's own thumbnail/intro-video keys, plus the
 * teacher's profile-photo/intro-video keys (pulled from
 * TeacherFile), into short-lived presigned S3 GET URLs, and attaches
 * the teacher's overall rating.
 */
async function attachCourseMedia(course: CourseDetailRow, rating: TeacherRating) {
  const teacherPhoto = course.teacher.files.find(
    (file) => file.type === TeacherFileType.PROFILE_PHOTO,
  );
  const teacherIntroVideo = course.teacher.files.find(
    (file) => file.type === TeacherFileType.INTRO_VIDEO,
  );

  const [thumbnailUrl, introVideoUrl, teacherPhotoUrl, teacherIntroVideoUrl] =
    await Promise.all([
      course.thumbnailKey
        ? createPresignedDownloadUrl(course.thumbnailKey)
        : null,
      course.introVideoKey
        ? createPresignedDownloadUrl(course.introVideoKey)
        : null,
      teacherPhoto ? createPresignedDownloadUrl(teacherPhoto.s3Key) : null,
      teacherIntroVideo
        ? createPresignedDownloadUrl(teacherIntroVideo.s3Key)
        : null,
    ]);

  return {
    ...course,
    thumbnailUrl,
    introVideoUrl,
    teacher: {
      id: course.teacher.id,
      firstName: course.teacher.firstName,
      lastName: course.teacher.lastName,
      visibleName: course.teacher.visibleName,
      aboutMe: course.teacher.aboutMe,
      city: course.teacher.city,
      country: course.teacher.country,
      photoUrl: teacherPhotoUrl,
      introVideoUrl: teacherIntroVideoUrl,
      averageRating: rating.averageRating,
      reviewCount: rating.totalReviews,
    },
  };
}

async function attachThumbnail(course: OtherCourseRow, rating: TeacherRating) {
  return {
    ...course,
    teacher: {
      ...course.teacher,
      averageRating: rating.averageRating,
      reviewCount: rating.totalReviews,
    },
    thumbnailUrl: course.thumbnailKey
      ? await createPresignedDownloadUrl(course.thumbnailKey)
      : null,
  };
}
