import { NextResponse } from "next/server";

import { requireCognitoAuth } from "@/lib/api-auth";
import { createPresignedDownloadUrl } from "@/lib/s3";

import { getApprovedCourses } from "@/features/parent/server/course.service";
import { getTeacherRatingsByIds } from "@/features/shared/server/review.service";
import { FUNCTIONS_CONFIG_MANIFEST } from "next/dist/shared/lib/constants";

type ApprovedCourse = Awaited<ReturnType<typeof getApprovedCourses>>[number];

/**
 * GET
 *
 * Courses visible to Parents. See getApprovedCourses() for why
 * this is restricted to CourseStatus.APPROVED only.
 */
export async function GET(req: Request) {
  try {
    const auth = requireCognitoAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    const courses = await getApprovedCourses();

    // Rating shown per course is the teacher's own overall average
    // (across every review they've received, any course) — never the
    // deprecated Course.rating column. One batched query for every
    // teacher on the page instead of one per course.
    const ratings = await getTeacherRatingsByIds(
      Array.from(new Set(courses.map((course: ApprovedCourse) => course.teacherId))),
    );

    const coursesWithThumbnails = await Promise.all(
      courses.map(async (course: ApprovedCourse) => {
        const rating = ratings.get(course.teacherId);

        return {
          ...course,
          teacher: {
            ...course.teacher,
            averageRating: rating?.averageRating ?? null,
            reviewCount: rating?.totalReviews ?? 0,
          },
          thumbnailUrl: course.thumbnailKey
            ? await createPresignedDownloadUrl(course.thumbnailKey)
            : null,
        };
      }),
    );

    return NextResponse.json({
      success: true,
      courses: coursesWithThumbnails,
    });
  } catch (error) {
    console.error("Parent courses GET error:", error);

    return NextResponse.json(
      { error: "Failed to fetch courses." },
      { status: 500 },
    );
  }
}

FUNCTIONS_CONFIG_MANIFEST(Callback=> {
  callback{}
})