import { NextResponse } from "next/server";
import { TeacherApprovalStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/api-auth";
import { notifyTeacherInterviewScheduled } from "@/features/shared/server/notificationTriggers.service";
import { logActivity, actorFromTokenPayload } from "@/features/shared/server/activityLog.service";

const MAX_DETAILS_LENGTH = 500;

/**
 * POST /api/admin/teachers/[teacherId]/interview
 * Body: { scheduledAt: ISO string (future), details?: string }
 *
 * Schedules (or reschedules) an interview for a Teacher whose application is
 * still PENDING. The Teacher is notified and sees it on their pending page.
 * Interview outcome is the normal decision: approve = selected, reject = not
 * selected (starts the appeal cooldown).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ teacherId: string }> },
) {
  try {
    const auth = requireAdminAuth(req);
    if ("error" in auth) return auth.error;

    const { teacherId } = await params;
    const body = await req.json().catch(() => null);

    const scheduledAt = new Date(body?.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json({ error: "A valid interview date and time is required." }, { status: 400 });
    }
    if (scheduledAt.getTime() <= Date.now()) {
      return NextResponse.json({ error: "The interview must be in the future." }, { status: 400 });
    }

    const details =
      typeof body?.details === "string" && body.details.trim()
        ? body.details.trim().slice(0, MAX_DETAILS_LENGTH)
        : null;

    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { id: true, firstName: true, lastName: true, approvalStatus: true, onboardingStatus: true },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    if (teacher.onboardingStatus !== "COMPLETED" || teacher.approvalStatus !== TeacherApprovalStatus.PENDING) {
      return NextResponse.json(
        { error: "An interview can only be scheduled for a pending application." },
        { status: 409 },
      );
    }

    const updated = await prisma.teacher.update({
      where: { id: teacherId },
      data: { interviewScheduledAt: scheduledAt, interviewDetails: details },
      select: { interviewScheduledAt: true, interviewDetails: true },
    });

    await notifyTeacherInterviewScheduled(teacherId, scheduledAt, details);

    await logActivity({
      action: "TEACHER_INTERVIEW_SCHEDULED",
      actorRole: "ADMIN",
      ...actorFromTokenPayload(auth.payload),
      description: `Interview scheduled for ${teacher.firstName} ${teacher.lastName} on ${scheduledAt.toISOString()}.`,
      metadata: { teacherId, scheduledAt: scheduledAt.toISOString() },
    });

    return NextResponse.json({ success: true, ...updated });
  } catch (error) {
    console.error("Schedule teacher interview error:", error);
    return NextResponse.json({ error: "Failed to schedule interview" }, { status: 500 });
  }
}

/** DELETE — cancel a scheduled interview (application stays PENDING). */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ teacherId: string }> },
) {
  try {
    const auth = requireAdminAuth(req);
    if ("error" in auth) return auth.error;

    const { teacherId } = await params;

    const result = await prisma.teacher.updateMany({
      where: { id: teacherId, approvalStatus: TeacherApprovalStatus.PENDING },
      data: { interviewScheduledAt: null, interviewDetails: null },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Pending application not found" }, { status: 404 });
    }

    await logActivity({
      action: "TEACHER_INTERVIEW_SCHEDULED",
      actorRole: "ADMIN",
      ...actorFromTokenPayload(auth.payload),
      description: "Teacher interview cancelled.",
      metadata: { teacherId, cancelled: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cancel teacher interview error:", error);
    return NextResponse.json({ error: "Failed to cancel interview" }, { status: 500 });
  }
}
