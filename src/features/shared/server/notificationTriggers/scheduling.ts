import {
    createNotification,
    notifyAllAdmins
} from "@/features/shared/server/notification.service";
import { prisma } from "@/lib/prisma";
import "server-only";
import { R, T, displayName, safe } from './shared';

// ---------------------------------------------------------------------------
// Demo bookings
// ---------------------------------------------------------------------------

export function notifyDemoBooked(bookingId: string) {
  return safe("demo booked", async () => {
    const booking = await prisma.demoBooking.findUnique({
      where: { id: bookingId },
      select: {
        parentId: true,
        teacherId: true,
        scheduledAt: true,
        student: { select: { firstName: true, visibleName: true } },
        course: { select: { courseTitle: true } },
      },
    });
    if (!booking) return;

    const courseTitle = booking.course.courseTitle || "a course";
    const studentName = displayName({
      firstName: booking.student.firstName,
      visibleName: booking.student.visibleName,
    });
    const dateLabel = booking.scheduledAt
      ? booking.scheduledAt.toLocaleString("en-IN", {
          day: "numeric",
          month: "short",
          hour: "numeric",
          minute: "2-digit",
        })
      : "soon";

    await createNotification({
      recipientId: booking.parentId,
      recipientRole: R.PARENT,
      type: T.DEMO_BOOKED,
      title: "Demo booked",
      message: `Demo for "${courseTitle}" is booked for ${dateLabel}.`,
      link: "/parent/free-demo",
    });

    await createNotification({
      recipientId: booking.teacherId,
      recipientRole: R.TEACHER,
      type: T.DEMO_BOOKED,
      title: "New demo booking",
      message: `${studentName} booked a demo for "${courseTitle}" on ${dateLabel}.`,
      link: "/teacher/demo",
    });
  });
}
// ---------------------------------------------------------------------------
// Reschedule requests
// ---------------------------------------------------------------------------

export function notifyReschedulePropose(requestId: string) {
  return safe("reschedule proposed", async () => {
    const request = await prisma.rescheduleRequest.findUnique({
      where: { id: requestId },
      select: {
        requestedBy: true,
        parentId: true,
        teacherId: true,
        proposedDate: true,
        proposedTime: true,
        enrollment: { select: { course: { select: { courseTitle: true } } } },
      },
    });
    if (!request) return;

    const courseTitle = request.enrollment.course.courseTitle || "the class";
    const dateLabel = request.proposedDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
    const timeLabel = request.proposedTime ? ` at ${request.proposedTime}` : "";

    const recipientId = request.requestedBy === "PARENT" ? request.teacherId : request.parentId;
    const recipientRole = request.requestedBy === "PARENT" ? R.TEACHER : R.PARENT;
    const proposer = request.requestedBy === "PARENT" ? "The parent" : "The teacher";

    await createNotification({
      recipientId,
      recipientRole,
      type: T.RESCHEDULE_PROPOSED,
      title: "Reschedule requested",
      message: `${proposer} proposed moving your "${courseTitle}" class to ${dateLabel}${timeLabel}.`,
      link: recipientRole === R.TEACHER ? "/teacher/reschedule" : "/parent/reschedule",
    });
  });
}
export function notifyRescheduleResponded(requestId: string, approved: boolean) {
  return safe("reschedule responded", async () => {
    const request = await prisma.rescheduleRequest.findUnique({
      where: { id: requestId },
      select: {
        requestedBy: true,
        parentId: true,
        teacherId: true,
        enrollment: { select: { course: { select: { courseTitle: true } } } },
      },
    });
    if (!request) return;

    const courseTitle = request.enrollment.course.courseTitle || "the class";

    // Notify whichever side originally proposed the move.
    const recipientId = request.requestedBy === "PARENT" ? request.parentId : request.teacherId;
    const recipientRole = request.requestedBy === "PARENT" ? R.PARENT : R.TEACHER;

    await createNotification({
      recipientId,
      recipientRole,
      type: approved ? T.RESCHEDULE_APPROVED : T.RESCHEDULE_REJECTED,
      title: approved ? "Reschedule approved" : "Reschedule rejected",
      message: approved
        ? `Your requested reschedule for "${courseTitle}" was approved.`
        : `Your requested reschedule for "${courseTitle}" was rejected.`,
      link: recipientRole === R.TEACHER ? "/teacher/reschedule" : "/parent/reschedule",
    });
  });
}
/**
 * Phase 1.2 / 1.3: a pending request was closed by the system
 * (expired at class start, or cancelled because the teacher's leave
 * was approved). Both parties are told; reuses RESCHEDULE_REJECTED so
 * no enum migration is needed.
 */
export function notifyRescheduleClosed(requestId: string, reason: "EXPIRED" | "TEACHER_LEAVE") {
  return safe("reschedule closed", async () => {
    const request = await prisma.rescheduleRequest.findUnique({
      where: { id: requestId },
      select: {
        parentId: true,
        teacherId: true,
        enrollment: { select: { course: { select: { courseTitle: true } } } },
      },
    });
    if (!request) return;

    const courseTitle = request.enrollment.course.courseTitle || "the class";
    const message =
      reason === "EXPIRED"
        ? `The reschedule request for "${courseTitle}" got no response before the class started, so it was closed. The original time stands.`
        : `The reschedule request for "${courseTitle}" was closed because of the teacher's approved leave. Any class affected will be moved or you'll be notified.`;

    await createNotification({
      recipientId: request.parentId,
      recipientRole: R.PARENT,
      type: T.RESCHEDULE_REJECTED,
      title: "Reschedule request closed",
      message,
      link: "/parent/reschedule",
    });

    await createNotification({
      recipientId: request.teacherId,
      recipientRole: R.TEACHER,
      type: T.RESCHEDULE_REJECTED,
      title: "Reschedule request closed",
      message,
      link: "/teacher/reschedule",
    });
  });
}
// ---------------------------------------------------------------------------
// Leave requests
// ---------------------------------------------------------------------------

export function notifyLeaveRequestSubmitted(teacherId: string, emergency = false) {
  return safe("leave request submitted", async () => {
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { firstName: true, lastName: true, visibleName: true },
    });
    if (!teacher) return;

    await notifyAllAdmins({
      type: T.LEAVE_REQUEST_SUBMITTED,
      title: emergency ? "Emergency leave request" : "New leave request",
      message: emergency
        ? `${displayName(teacher)} submitted a leave request starting in under 24 hours. Please review it soon.`
        : `${displayName(teacher)} submitted a leave request for review.`,
      link: "/admin/leave-requests",
    });
  });
}
export function notifyLeaveRequestResponded(teacherId: string, approved: boolean) {
  return safe("leave request responded", async () => {
    await createNotification({
      recipientId: teacherId,
      recipientRole: R.TEACHER,
      type: approved ? T.LEAVE_REQUEST_APPROVED : T.LEAVE_REQUEST_REJECTED,
      title: approved ? "Leave request approved" : "Leave request rejected",
      message: approved
        ? "Your leave request was approved by Admin."
        : "Your leave request was rejected by Admin.",
      link: "/teacher/leave",
    });
  });
}
