import {
    createNotification,
    createNotifications
} from "@/features/shared/server/notification.service";
import { prisma } from "@/lib/prisma";
import "server-only";
import { R, T, displayName, safe } from './shared';

// ---------------------------------------------------------------------------
// Class sessions
// ---------------------------------------------------------------------------

export function notifyClassSessionCompleted(sessionId: string) {
  return safe("class session completed", async () => {
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
      select: {
        parentId: true,
        teacherId: true,
        scheduledDate: true,
        cycleId: true,
        enrollment: { select: { course: { select: { courseTitle: true } } } },
      },
    });
    if (!session) return;

    const courseTitle = session.enrollment.course.courseTitle || "your class";
    const dateLabel = session.scheduledDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });

    // Cycle-model classes (Part 2A): the parent has 48 hours to
    // confirm or report, from the class page.
    if (session.cycleId) {
      await createNotification({
        recipientId: session.parentId,
        recipientRole: R.PARENT,
        type: T.CLASS_SESSION_COMPLETED,
        title: "Class completed",
        message: `The ${dateLabel} class for "${courseTitle}" is complete. Tap All good, or report a problem, within 48 hours — otherwise it is accepted automatically.`,
        link: `/parent/classes/${sessionId}/join`,
      });
      return;
    }

    await createNotification({
      recipientId: session.parentId,
      recipientRole: R.PARENT,
      type: T.CLASS_SESSION_COMPLETED,
      title: "Class marked complete",
      message: `The ${dateLabel} class for "${courseTitle}" was marked complete by the teacher.`,
      link: "/parent/calendar",
    });
  });
}
/**
 * "Lecture will start in X" — called only from the reminder cron
 * (/api/cron/session-reminders), never from request-handling code,
 * since it needs to fire on a schedule rather than in response to a
 * user action. `minutesUntil` is folded into the copy directly
 * rather than left for the client to compute.
 */
export function notifyClassSessionStartingSoon(
  sessionId: string,
  minutesUntil: number,
) {
  return safe("class session reminder", async () => {
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
      select: {
        parentId: true,
        teacherId: true,
        scheduledTime: true,
        enrollment: {
          select: {
            course: { select: { courseTitle: true } },
            student: { select: { firstName: true, visibleName: true } },
          },
        },
      },
    });
    if (!session) return;

    const courseTitle = session.enrollment.course.courseTitle || "your class";
    const studentName = displayName({
      firstName: session.enrollment.student.firstName,
      visibleName: session.enrollment.student.visibleName,
    });
    const timeLabel = session.scheduledTime ? ` at ${session.scheduledTime}` : "";

    await createNotifications([
      {
        recipientId: session.parentId,
        recipientRole: R.PARENT,
        type: T.CLASS_SESSION_REMINDER,
        title: "Class starting soon",
        message: `${studentName}'s "${courseTitle}" class starts in about ${minutesUntil} minutes${timeLabel}.`,
        link: "/parent/calendar",
      },
      {
        recipientId: session.teacherId,
        recipientRole: R.TEACHER,
        type: T.CLASS_SESSION_REMINDER,
        title: "Class starting soon",
        message: `Your "${courseTitle}" class with ${studentName} starts in about ${minutesUntil} minutes${timeLabel}.`,
        link: "/teacher/classes",
      },
    ]);
  });
}
