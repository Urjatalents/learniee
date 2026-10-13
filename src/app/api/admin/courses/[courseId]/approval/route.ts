import { NextResponse } from "next/server";
import { CourseStatus } from "@prisma/client";

import { requireVerifiedAdminAuth } from "@/lib/verifiedAdminAuth";

import {
  getCourseByIdForAdmin,
  setCourseApproval,
} from "@/features/admin/server/course.service";
import { logActivity, actorFromTokenPayload } from "@/features/shared/server/activityLog.service";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    // -----------------------------------------
    // Get course ID
    // -----------------------------------------
    const { courseId } = await params;

    if (!courseId) {
      return NextResponse.json(
        { error: "Course ID is required" },
        { status: 400 },
      );
    }

    // -----------------------------------------
    // Auth + admin role check
    // -----------------------------------------
    const auth = await requireVerifiedAdminAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    // -----------------------------------------
    // Get request body
    // -----------------------------------------
    const body = await req.json();

    const { status } = body;

    // -----------------------------------------
    // Validate approval status
    // -----------------------------------------
    if (
      status !== CourseStatus.APPROVED &&
      status !== CourseStatus.REJECTED
    ) {
      return NextResponse.json(
        { error: "Invalid approval status" },
        { status: 400 },
      );
    }

    // -----------------------------------------
    // Find course
    // -----------------------------------------
    const course = await getCourseByIdForAdmin(courseId);

    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 },
      );
    }

    // -----------------------------------------
    // Update approval status
    // -----------------------------------------
    const updatedCourse = await setCourseApproval(courseId, status);

    const approved = status === CourseStatus.APPROVED;

    await logActivity({
      action: approved ? "COURSE_APPROVED" : "COURSE_REJECTED",
      actorRole: "ADMIN",
      ...actorFromTokenPayload(auth.payload),
      description: `Course "${updatedCourse.courseTitle || courseId}" ${
        approved ? "approved" : "rejected"
      }.`,
      metadata: { courseId },
    });

    return NextResponse.json({
      success: true,
      course: updatedCourse,
    });
  } catch (error) {
    console.error("Course approval error:", error);

    return NextResponse.json(
      { error: "Failed to update course approval status" },
      { status: 500 },
    );
  }
}
