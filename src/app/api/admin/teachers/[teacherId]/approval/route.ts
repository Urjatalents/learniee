import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/api-auth";
import { TeacherApprovalStatus } from "@prisma/client";
import { notifyTeacherApprovalStatus } from "@/features/shared/server/notificationTriggers.service";
import { computeReapplyAvailableAt } from "@/features/teacher/utils/teacherAppeal";
import { logActivity, actorFromTokenPayload } from "@/features/shared/server/activityLog.service";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ teacherId: string }> }
) {
  try {
    // -----------------------------------------
    // Get teacher ID
    // -----------------------------------------
    const { teacherId } = await params;

    if (!teacherId) {
      return NextResponse.json(
        { error: "Teacher ID is required" },
        { status: 400 }
      );
    }

    // -----------------------------------------
    // Auth + admin role check
    // -----------------------------------------
    const auth = requireAdminAuth(req);

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
      status !== TeacherApprovalStatus.APPROVED &&
      status !== TeacherApprovalStatus.REJECTED
    ) {
      return NextResponse.json(
        { error: "Invalid approval status" },
        { status: 400 }
      );
    }

    // -----------------------------------------
    // Find teacher
    // -----------------------------------------
    const teacher = await prisma.teacher.findUnique({
      where: {
        id: teacherId,
      },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: "Teacher not found" },
        { status: 404 }
      );
    }

    // -----------------------------------------
    // Update approval status
    // -----------------------------------------
    const approved = status === TeacherApprovalStatus.APPROVED;
    const now = new Date();

    // Selected (approved): clear any cooldown. Not selected (rejected): start
    // the cooldown — the Teacher can appeal only after `reapplyAvailableAt`.
    const reapplyAvailableAt = approved ? null : computeReapplyAvailableAt(now);

    const updatedTeacher = await prisma.teacher.update({
      where: {
        id: teacherId,
      },

      data: {
        approvalStatus: status,
        rejectedAt: approved ? null : now,
        reapplyAvailableAt,
      },
    });

    await notifyTeacherApprovalStatus(teacherId, approved, reapplyAvailableAt);

    await logActivity({
      action: approved ? "TEACHER_APPROVED" : "TEACHER_REJECTED",
      actorRole: "ADMIN",
      ...actorFromTokenPayload(auth.payload),
      description: `Teacher ${updatedTeacher.firstName} ${updatedTeacher.lastName} ${
        approved ? "approved" : "rejected"
      }.`,
      metadata: { teacherId },
    });

    return NextResponse.json({
      success: true,
      teacher: updatedTeacher,
    });

  } catch (error) {
    console.error(
      "Teacher approval error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to update teacher approval status",
      },
      {
        status: 500,
      }
    );
  }
}