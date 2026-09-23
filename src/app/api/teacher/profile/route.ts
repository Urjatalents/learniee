import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCognitoAuth } from "@/lib/api-auth";
import { getTeacherRatingSummary } from "@/features/shared/server/review.service";

/**
 * GET
 *
 * Originally just name/email for TeacherNavbar/`/teacher`. Widened
 * (Sep 10, 2026) to also back the new `/teacher/profile` page — the
 * navbar's fetch simply ignores the extra fields it doesn't use.
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
        firstName: true,
        lastName: true,
        visibleName: true,
        email: true,
        phone: true,
        whatsapp: true,
        address: true,
        city: true,
        country: true,
        pincode: true,
        aboutMe: true,
        approvalStatus: true,
        isIITian: true,
        createdAt: true,
      },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: "Teacher profile not found" },
        { status: 404 }
      );
    }

    const rating = await getTeacherRatingSummary(teacher.id);

    return NextResponse.json({
      teacher: {
        ...teacher,
        averageRating: rating.averageRating,
        reviewCount: rating.totalReviews,
      },
    });

  } catch (error) {
    console.error(
      "Teacher profile error:",
      error
    );

    return NextResponse.json(
      { error: "Failed to fetch teacher profile" },
      { status: 500 }
    );
  }
}

/**
 * PATCH
 *
 * Self-service edit for the new `/teacher/profile` page. Only the
 * "contact card" fields — display name, contact details, address,
 * bio — same reasoning as the Parent profile route: onboarding-only
 * fields (`dobDay`/`dobMonth`/`dobYear`, `gender`, `nationality`,
 * `panCardNumber`, `criminalCase`) stay scoped to the onboarding
 * flow, and `email`/`approvalStatus` are never editable here (email
 * is the Cognito-linked identity field; approvalStatus is Admin-only,
 * see `/admin/teachers`).
 */
const EDITABLE_FIELDS = [
  "firstName",
  "lastName",
  "visibleName",
  "phone",
  "whatsapp",
  "address",
  "city",
  "country",
  "pincode",
  "aboutMe",
] as const;

type EditableField = (typeof EDITABLE_FIELDS)[number];
type ProfileUpdateBody = Partial<Record<EditableField, string>>;

export async function PATCH(req: Request) {
  try {
    const auth = requireCognitoAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    const body = (await req.json()) as ProfileUpdateBody;

    const data: ProfileUpdateBody = {};
    for (const field of EDITABLE_FIELDS) {
      if (typeof body[field] === "string") {
        data[field] = body[field]!.trim();
      }
    }

    if (data.firstName === "" || data.lastName === "") {
      return NextResponse.json(
        { error: "First name and last name are required." },
        { status: 400 },
      );
    }

    const teacher = await prisma.teacher.update({
      where: { cognitoId: auth.payload.sub },
      data,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        visibleName: true,
        email: true,
        phone: true,
        whatsapp: true,
        address: true,
        city: true,
        country: true,
        pincode: true,
        aboutMe: true,
        approvalStatus: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ teacher });
  } catch (error) {
    console.error("Teacher profile update error:", error);

    return NextResponse.json(
      { error: "Failed to update your profile." },
      { status: 500 },
    );
  }
}
