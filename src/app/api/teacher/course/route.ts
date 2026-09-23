import { NextResponse } from "next/server";

import { requireCognitoAuth } from "@/lib/api-auth";

import {
  createCourse,
  getTeacherCourses,
  type CourseFormInput,
} from "@/features/courses/server/course.service";
import { getStandardPrice } from "@/features/courses/utils/coursePricing";

import { prisma } from "@/lib/prisma";

/**
 * GET
 *
 * Fetch all courses belonging to the logged-in teacher.
 */
export async function GET(req: Request) {
  try {
    const auth = requireCognitoAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    const teacher = await prisma.teacher.findUnique({
      where: {
        cognitoId: auth.payload.sub,
      },
      select: {
        id: true,
      },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: "Teacher not found." },
        { status: 404 },
      );
    }

    const courses = await getTeacherCourses(teacher.id);

    return NextResponse.json({
      success: true,
      courses,
    });
  } catch (error) {
    console.error("Teacher courses GET error:", error);

    return NextResponse.json(
      { error: "Failed to fetch courses." },
      { status: 500 },
    );
  }
}

/**
 * POST
 *
 * Create a new course for the logged-in teacher.
 */
export async function POST(req: Request) {
  try {
    const auth = requireCognitoAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    const teacher = await prisma.teacher.findUnique({
      where: {
        cognitoId: auth.payload.sub,
      },
      select: {
        id: true,
      },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: "Teacher not found." },
        { status: 404 },
      );
    }

    const input: CourseFormInput = await req.json();

    if (!input.courseTitle?.trim()) {
      return NextResponse.json(
        { error: "Course title is required." },
        { status: 400 },
      );
    }

    if (input.certificateEnabled) {
      const threshold = Number(input.certificateSessionThreshold);

      if (!Number.isFinite(threshold) || threshold < 1) {
        return NextResponse.json(
          { error: "Certificate session threshold must be a positive number." },
          { status: 400 },
        );
      }
    }

    // Standard pricing (Sep 2026): a manual price always works, but
    // if the teacher leaves Price blank we need a standard rate to
    // fall back to — i.e. a recognised grade, or the IITian flag.
    const hasManualPrice = Boolean(input.price) && Number.isFinite(Number(input.price));
    const hasStandardPrice =
      getStandardPrice(input.grade || null, Boolean(input.isIITian)) != null;

    if (!hasManualPrice && !hasStandardPrice) {
      return NextResponse.json(
        {
          error:
            "Select a grade (or mark this course as IITian-listed) to get a standard price, or enter your own price.",
        },
        { status: 400 },
      );
    }

    const course = await createCourse(
      teacher.id,
      input,
    );

    return NextResponse.json(
      {
        success: true,
        course,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Teacher course POST error:", error);

    return NextResponse.json(
      { error: "Failed to create course." },
      { status: 500 },
    );
  }
}