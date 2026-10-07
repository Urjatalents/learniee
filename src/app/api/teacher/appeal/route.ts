import { NextResponse } from "next/server";
import { TeacherApprovalStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCognitoAuth } from "@/lib/api-auth";
import { isAppealOpen } from "@/features/teacher/utils/teacherAppeal";
import { notifyAdminsTeacherAppealed } from "@/features/shared/server/notificationTriggers.service";
import { logActivity } from "@/features/shared/server/activityLog.service";

/**
 * POST /api/teacher/appeal
 *
 * A rejected Teacher appeals once the cooldown has passed. The application
 * goes back to PENDING (Admin reviews it again, can schedule a new interview);
 * the Teacher still cannot open the dashboard until approved.
 */
export async function POST(req: Request) {
  try {
    const auth = requireCognitoAuth(req);
    if ("error" in auth) return auth.error;

    const teacher = await prisma.teacher.findUnique({
      where: { cognitoId: auth.payload.sub },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        approvalStatus: true,
        reapplyAvailableAt: true,
      },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    if (teacher.approvalStatus !== TeacherApprovalStatus.REJECTED) {
      return NextResponse.json({ error: "There is nothing to appeal." }, { status: 409 });
    }

    const now = new Date();

    if (!isAppealOpen(teacher.reapplyAvailableAt, now)) {
      return NextResponse.json(
        { error: "You can appeal only after the waiting period ends.", reapplyAvailableAt: teacher.reapplyAvailableAt },
        { status: 403 },
      );
    }

    // Conditional update so a double click can't count twice.
    const result = await prisma.teacher.updateMany({
      where: { id: teacher.id, approvalStatus: TeacherApprovalStatus.REJECTED },
      data: {
        approvalStatus: TeacherApprovalStatus.PENDING,
        rejectedAt: null,
        reapplyAvailableAt: null,
        interviewScheduledAt: null,
        interviewDetails: null,
        appealCount: { increment: 1 },
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "There is nothing to appeal." }, { status: 409 });
    }

    const name = `${teacher.firstName} ${teacher.lastName}`;

    await notifyAdminsTeacherAppealed(name, teacher.id);

    await logActivity({
      action: "TEACHER_APPEALED",
      actorRole: "TEACHER",
      actorId: teacher.id,
      actorName: name,
      actorEmail: teacher.email,
      description: `${name} appealed a rejected application.`,
      metadata: { teacherId: teacher.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Teacher appeal error:", error);
    return NextResponse.json({ error: "Failed to submit appeal" }, { status: 500 });
  }
}
