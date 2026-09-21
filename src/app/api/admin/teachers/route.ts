import { NextResponse } from "next/server";
import { TeacherApprovalStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/api-auth";

const STATUSES = Object.values(TeacherApprovalStatus);

/**
 * GET /api/admin/teachers?status=PENDING|APPROVED|REJECTED  (default PENDING)
 *
 * Lightweight list for the Admin "Teacher Applications" page: one summary per
 * teacher who finished onboarding, plus a count per status for the tabs.
 * Files and their signed URLs are NOT included here — the full application
 * comes from GET /api/admin/teachers/[teacherId].
 */
export async function GET(req: Request) {
  try {
    const auth = requireAdminAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    const requested = new URL(req.url).searchParams.get("status");
    const status = STATUSES.find((s) => s === requested) ?? TeacherApprovalStatus.PENDING;

    const [teachers, grouped] = await Promise.all([
      prisma.teacher.findMany({
        where: {
          approvalStatus: status,
          onboardingStatus: "COMPLETED",
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          visibleName: true,
          city: true,
          country: true,
          approvalStatus: true,
          createdAt: true,
          updatedAt: true,
          panCardNumber: true,
          professionalInfo: {
            select: { qualifications: true, overallExperience: true },
          },
          files: { select: { type: true } },
        },
        // Pending = oldest first (work through the queue in order);
        // Approved / Rejected = most recently decided first.
        orderBy: {
          updatedAt: status === TeacherApprovalStatus.PENDING ? "asc" : "desc",
        },
      }),

      prisma.teacher.groupBy({
        by: ["approvalStatus"],
        where: { onboardingStatus: "COMPLETED" },
        _count: { _all: true },
      }),
    ]);

    const counts = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
    for (const row of grouped) {
      counts[row.approvalStatus] = row._count._all;
    }

    return NextResponse.json({
      success: true,
      counts,
      teachers: teachers.map((teacher) => ({
        id: teacher.id,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        email: teacher.email,
        visibleName: teacher.visibleName,
        city: teacher.city,
        country: teacher.country,
        qualifications: teacher.professionalInfo?.qualifications ?? null,
        overallExperience: teacher.professionalInfo?.overallExperience ?? null,
        approvalStatus: teacher.approvalStatus,
        createdAt: teacher.createdAt,
        updatedAt: teacher.updatedAt,
        fileTypes: teacher.files.map((file) => file.type),
        hasPan: Boolean(teacher.panCardNumber?.trim()),
      })),
    });
  } catch (error) {
    console.error("Admin teachers error:", error);

    return NextResponse.json(
      { error: "Failed to fetch teachers" },
      { status: 500 },
    );
  }
}
