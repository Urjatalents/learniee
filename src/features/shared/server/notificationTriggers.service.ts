import "server-only";

import { prisma } from "@/lib/prisma";
import {
  NotificationRecipientRole,
  NotificationType,
  ComplainantRole,
  ComplaintStatus,
} from "@prisma/client";

import {
  createNotification,
  createNotifications,
  notifyAllAdmins,
} from "@/features/shared/server/notification.service";
import { formatPlatformTime } from "@/lib/platformTime";

/**
 * One function per business event that should produce an in-app
 * notification. Kept in a single file (rather than scattered across
 * every feature's own server folder) so "what notifications exist in
 * this app" has one place to read — the actual triggering call still
 * lives next to the business logic it's attached to (e.g.
 * `enrollmentApproval.service.ts` calls
 * `notifyEnrollmentTeacherApproved()` right after the status update).
 *
 * Every function here swallows its own errors (logs, never throws) —
 * a notification-write failure must never block or roll back the
 * real business transaction it's attached to. Call sites can invoke
 * these without their own try/catch.
 */

async function safe(label: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (err) {
    console.error(`Notification trigger failed (${label}):`, err);
  }
}

const R = NotificationRecipientRole;
const T = NotificationType;

/** Small display-name helper — visibleName wins, else first+last. */
function displayName(p: {
  visibleName?: string | null;
  firstName: string;
  lastName?: string | null;
}) {
  return p.visibleName || `${p.firstName} ${p.lastName ?? ""}`.trim();
}

/**
 * One shared lookup used by every Enrollment-related trigger below —
 * the mutation functions in enrollmentApproval.service.ts /
 * enrollment.service.ts don't all `include` display names on their
 * own update() calls, so triggers fetch them once here rather than
 * widening every mutation's include clause just for notification
 * copy. Cheap (single indexed findUnique), and only ever called on
 * already-successful state transitions, never on hot read paths.
 */
async function loadEnrollmentContext(enrollmentId: string) {
  return prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: {
      id: true,
      parentId: true,
      teacherId: true,
      studentId: true,
      status: true,
      student: { select: { firstName: true, visibleName: true } },
      teacher: { select: { firstName: true, lastName: true, visibleName: true } },
      parent: { select: { firstName: true, lastName: true, visibleName: true } },
      course: { select: { courseTitle: true, subject: true } },
    },
  });
}

// ---------------------------------------------------------------------------
// Enrollment lifecycle
// ---------------------------------------------------------------------------

export function notifyEnrollmentCreated(enrollmentId: string) {
  return safe("enrollment created", async () => {
    const e = await loadEnrollmentContext(enrollmentId);
    if (!e) return;

    const studentName = displayName({ firstName: e.student.firstName, visibleName: e.student.visibleName });
    const courseTitle = e.course.courseTitle || "your course";

    await createNotification({
      recipientId: e.parentId,
      recipientRole: R.PARENT,
      type: T.ENROLLMENT_CREATED,
      title: "Enrolled successfully",
      message: `${studentName}'s enrollment in "${courseTitle}" is confirmed — waiting on the teacher's review.`,
      link: "/parent/enrollments",
    });

    await createNotification({
      recipientId: e.teacherId,
      recipientRole: R.TEACHER,
      type: T.ENROLLMENT_CREATED,
      title: "New enrollment to review",
      message: `${studentName} just enrolled in "${courseTitle}" — review it to continue.`,
      link: "/teacher/enrollments",
    });
  });
}

export function notifyEnrollmentTeacherApproved(enrollmentId: string) {
  return safe("enrollment teacher-approved", async () => {
    const e = await loadEnrollmentContext(enrollmentId);
    if (!e) return;

    const courseTitle = e.course.courseTitle || "your course";

    await createNotification({
      recipientId: e.parentId,
      recipientRole: R.PARENT,
      type: T.ENROLLMENT_TEACHER_APPROVED,
      title: "Teacher approved your enrollment",
      message: `Your enrollment in "${courseTitle}" was approved and is now waiting on final approval.`,
      link: "/parent/enrollments",
    });

    await notifyAllAdmins({
      type: T.ENROLLMENT_TEACHER_APPROVED,
      title: "Enrollment awaiting your approval",
      message: `An enrollment in "${courseTitle}" has cleared Teacher review and needs Admin approval.`,
      link: "/admin/enrollments",
    });
  });
}

export function notifyEnrollmentRevisionProposed(enrollmentId: string, note: string) {
  return safe("enrollment revision proposed", async () => {
    const e = await loadEnrollmentContext(enrollmentId);
    if (!e) return;

    const courseTitle = e.course.courseTitle || "your course";
    const teacherName = displayName(e.teacher);

    await createNotification({
      recipientId: e.parentId,
      recipientRole: R.PARENT,
      type: T.ENROLLMENT_REVISION_PROPOSED,
      title: "Teacher proposed a change",
      message: `${teacherName} proposed a change to "${courseTitle}": ${note.slice(0, 140)}`,
      link: "/parent/enrollments",
    });
  });
}

export function notifyEnrollmentRevisionConfirmed(enrollmentId: string) {
  return safe("enrollment revision confirmed", async () => {
    const e = await loadEnrollmentContext(enrollmentId);
    if (!e) return;

    const courseTitle = e.course.courseTitle || "the enrollment";

    await createNotification({
      recipientId: e.teacherId,
      recipientRole: R.TEACHER,
      type: T.ENROLLMENT_REVISION_CONFIRMED,
      title: "Parent confirmed your change",
      message: `The parent confirmed your proposed change to "${courseTitle}" — it's now with Admin.`,
      link: "/teacher/enrollments",
    });

    await notifyAllAdmins({
      type: T.ENROLLMENT_REVISION_CONFIRMED,
      title: "Enrollment awaiting your approval",
      message: `An enrollment in "${courseTitle}" cleared a revision reconfirmation and needs Admin approval.`,
      link: "/admin/enrollments",
    });
  });
}

export function notifyEnrollmentRevisionDeclined(enrollmentId: string) {
  return safe("enrollment revision declined", async () => {
    const e = await loadEnrollmentContext(enrollmentId);
    if (!e) return;

    const courseTitle = e.course.courseTitle || "the enrollment";

    await createNotification({
      recipientId: e.teacherId,
      recipientRole: R.TEACHER,
      type: T.ENROLLMENT_REVISION_DECLINED,
      title: "Parent declined your change",
      message: `The parent declined your proposed change to "${courseTitle}" — the enrollment is cancelled.`,
      link: "/teacher/enrollments",
    });
  });
}

export function notifyEnrollmentRejected(
  enrollmentId: string,
  rejectedBy: "TEACHER" | "ADMIN",
) {
  return safe("enrollment rejected", async () => {
    const e = await loadEnrollmentContext(enrollmentId);
    if (!e) return;

    const courseTitle = e.course.courseTitle || "your enrollment";
    const by = rejectedBy === "TEACHER" ? "the teacher" : "an admin";

    await createNotification({
      recipientId: e.parentId,
      recipientRole: R.PARENT,
      type: T.ENROLLMENT_REJECTED,
      title: "Enrollment rejected",
      message: `Your enrollment in "${courseTitle}" was rejected by ${by}.`,
      link: "/parent/enrollments",
    });

    if (rejectedBy === "ADMIN") {
      await createNotification({
        recipientId: e.teacherId,
        recipientRole: R.TEACHER,
        type: T.ENROLLMENT_REJECTED,
        title: "Enrollment rejected by Admin",
        message: `Admin rejected the enrollment in "${courseTitle}" you'd already approved.`,
        link: "/teacher/enrollments",
      });
    }
  });
}

export function notifyEnrollmentActivated(enrollmentId: string) {
  return safe("enrollment activated", async () => {
    const e = await loadEnrollmentContext(enrollmentId);
    if (!e) return;

    const courseTitle = e.course.courseTitle || "your course";
    const studentName = displayName({ firstName: e.student.firstName, visibleName: e.student.visibleName });

    await createNotification({
      recipientId: e.parentId,
      recipientRole: R.PARENT,
      type: T.ENROLLMENT_ACTIVATED,
      title: "Enrollment is now active",
      message: `${studentName}'s enrollment in "${courseTitle}" is fully approved — classes will be scheduled.`,
      link: "/parent/enrollments",
    });

    await createNotification({
      recipientId: e.teacherId,
      recipientRole: R.TEACHER,
      type: T.ENROLLMENT_ACTIVATED,
      title: "Enrollment is now active",
      message: `The enrollment for ${studentName} in "${courseTitle}" is active — classes have been scheduled.`,
      link: "/teacher/enrollments",
    });
  });
}

export function notifyEnrollmentLapsed(enrollmentId: string) {
  return safe("enrollment auto-lapsed", async () => {
    const e = await loadEnrollmentContext(enrollmentId);
    if (!e) return;

    const courseTitle = e.course.courseTitle || "your course";
    const studentName = displayName({ firstName: e.student.firstName, visibleName: e.student.visibleName });

    await createNotification({
      recipientId: e.parentId,
      recipientRole: R.PARENT,
      type: T.ENROLLMENT_LAPSED,
      title: "Enrollment marked as lapsed",
      message: `${studentName}'s enrollment in "${courseTitle}" was marked lapsed after 45 days with no class conducted. Contact the teacher or Admin to resume.`,
      link: "/parent/enrollments",
    });

    await createNotification({
      recipientId: e.teacherId,
      recipientRole: R.TEACHER,
      type: T.ENROLLMENT_LAPSED,
      title: "Enrollment marked as lapsed",
      message: `The enrollment for ${studentName} in "${courseTitle}" was marked lapsed after 45 days with no class conducted.`,
      link: "/teacher/enrollments",
    });

    await notifyAllAdmins({
      type: T.ENROLLMENT_LAPSED,
      title: "Enrollment auto-lapsed",
      message: `${studentName}'s enrollment in "${courseTitle}" auto-lapsed after 45 days with no class conducted.`,
      link: "/admin/enrollments",
    });
  });
}

/**
 * Enrollment due-date payment reminder (added Sep 17, 2026) — the
 * 5-day-before-`dueDate` reminder called out in
 * `export.service.ts`'s file header and
 * 04-BUILD-PLAN-TIMELINE.md's Week 4 scope. Parent-only: Teacher/
 * Admin don't act on this, and no other trigger in this file
 * notifies Accounts yet, so this doesn't invent that pattern here.
 */
export function notifyEnrollmentDueDateReminder(enrollmentId: string, daysUntilDue: number) {
  return safe("enrollment due-date reminder", async () => {
    const e = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      select: {
        parentId: true,
        dueDate: true,
        totalAmount: true,
        student: { select: { firstName: true, visibleName: true } },
        course: { select: { courseTitle: true } },
      },
    });
    if (!e) return;

    const courseTitle = e.course.courseTitle || "your course";
    const studentName = displayName({ firstName: e.student.firstName, visibleName: e.student.visibleName });
    const amountLabel = `₹${Number(e.totalAmount).toLocaleString("en-IN")}`;
    const dayLabel = daysUntilDue === 1 ? "1 day" : `${daysUntilDue} days`;
    const dueDateLabel = e.dueDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    await createNotification({
      recipientId: e.parentId,
      recipientRole: R.PARENT,
      type: T.PAYMENT_DUE_REMINDER,
      title: "Payment due soon",
      message: `${amountLabel} is due in ${dayLabel} (${dueDateLabel}) for ${studentName}'s enrollment in "${courseTitle}".`,
      link: "/parent/enrollments",
    });
  });
}

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

/** Cycle just completed and payout moved to READY_FOR_PAYOUT — lets the Teacher know money is queued. */
export function notifyCyclePayoutReady(enrollmentId: string) {
  return safe("cycle payout ready", async () => {
    const e = await loadEnrollmentContext(enrollmentId);
    if (!e) return;

    const courseTitle = e.course.courseTitle || "your enrollment";

    await createNotification({
      recipientId: e.teacherId,
      recipientRole: R.TEACHER,
      type: T.CYCLE_PAYOUT_READY,
      title: "A cycle just completed",
      message: `A billing cycle for "${courseTitle}" is complete — payout is queued for Accounts' review.`,
      link: "/teacher/rate-calculator",
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

// ---------------------------------------------------------------------------
// Leave requests
// ---------------------------------------------------------------------------

export function notifyLeaveRequestSubmitted(teacherId: string) {
  return safe("leave request submitted", async () => {
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { firstName: true, lastName: true, visibleName: true },
    });
    if (!teacher) return;

    await notifyAllAdmins({
      type: T.LEAVE_REQUEST_SUBMITTED,
      title: "New leave request",
      message: `${displayName(teacher)} submitted a leave request for review.`,
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

// ---------------------------------------------------------------------------
// Homework
// ---------------------------------------------------------------------------

export function notifyHomeworkAssigned(homeworkId: string) {
  return safe("homework assigned", async () => {
    const homework = await prisma.homework.findUnique({
      where: { id: homeworkId },
      select: {
        parentId: true,
        title: true,
        enrollment: { select: { course: { select: { courseTitle: true } } } },
      },
    });
    if (!homework) return;

    await createNotification({
      recipientId: homework.parentId,
      recipientRole: R.PARENT,
      type: T.HOMEWORK_ASSIGNED,
      title: "New homework assigned",
      message: `"${homework.title}" was assigned for ${homework.enrollment.course.courseTitle || "your course"}.`,
      link: "/parent/homework-tests",
    });
  });
}

export function notifyHomeworkSubmitted(homeworkId: string) {
  return safe("homework submitted", async () => {
    const homework = await prisma.homework.findUnique({
      where: { id: homeworkId },
      select: {
        teacherId: true,
        title: true,
        student: { select: { firstName: true, visibleName: true } },
      },
    });
    if (!homework) return;

    const studentName = displayName({
      firstName: homework.student.firstName,
      visibleName: homework.student.visibleName,
    });

    await createNotification({
      recipientId: homework.teacherId,
      recipientRole: R.TEACHER,
      type: T.HOMEWORK_SUBMITTED,
      title: "Homework submitted",
      message: `${studentName} submitted "${homework.title}" — ready for review.`,
      link: "/teacher/hw-tests",
    });
  });
}

export function notifyHomeworkGraded(homeworkId: string) {
  return safe("homework graded", async () => {
    const homework = await prisma.homework.findUnique({
      where: { id: homeworkId },
      select: { parentId: true, title: true },
    });
    if (!homework) return;

    await createNotification({
      recipientId: homework.parentId,
      recipientRole: R.PARENT,
      type: T.HOMEWORK_GRADED,
      title: "Homework reviewed",
      message: `Your teacher reviewed "${homework.title}" and left feedback.`,
      link: "/parent/homework-tests",
    });
  });
}

// ---------------------------------------------------------------------------
// Courses & teacher approval
// ---------------------------------------------------------------------------

export function notifyCourseApproval(courseId: string, approved: boolean) {
  return safe("course approval", async () => {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { teacherId: true, courseTitle: true, subject: true, status: true },
    });
    if (!course) return;

    await createNotification({
      recipientId: course.teacherId,
      recipientRole: R.TEACHER,
      type: approved ? T.COURSE_APPROVED : T.COURSE_REJECTED,
      title: approved ? "Course approved" : "Course rejected",
      message: approved
        ? `Your course "${course.courseTitle || "Untitled course"}" was approved and is now visible to parents.`
        : `Your course "${course.courseTitle || "Untitled course"}" was rejected — check Admin's notes.`,
      link: "/teacher/course-management",
    });

    if (approved && course.subject?.trim()) {
      await notifyInterestedParentsOfNewCourse(courseId);
    }
  });
}

/**
 * "New lecture with the same subject has been listed" — fans out to
 * every Parent whose `favoriteSubject` case-insensitively matches
 * the newly-approved course's subject. Capped at 200 recipients per
 * course so one very popular subject can't turn a single approval
 * into an unbounded write; a Notification Center-level "digest"
 * instead of per-course fan-out is the kind of thing #32's fuller
 * Phase 2 version should eventually replace this with.
 */
const INTERESTED_PARENT_NOTIFY_CAP = 200;

async function notifyInterestedParentsOfNewCourse(courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      courseTitle: true,
      subject: true,
      teacher: { select: { firstName: true, lastName: true, visibleName: true } },
    },
  });
  if (!course?.subject) return;

  const interestedParents = await prisma.parentProfile.findMany({
    where: { favoriteSubject: { equals: course.subject, mode: "insensitive" } },
    select: { id: true },
    take: INTERESTED_PARENT_NOTIFY_CAP,
  });
  if (interestedParents.length === 0) return;

  const teacherName = displayName(course.teacher);
  const courseTitle = course.courseTitle || "A new course";

  await createNotifications(
    interestedParents.map((p) => ({
      recipientId: p.id,
      recipientRole: R.PARENT,
      type: T.COURSE_PUBLISHED_MATCH,
      title: "New course in a subject you like",
      message: `"${courseTitle}" by ${teacherName} was just listed for ${course.subject} — you marked this as a favorite subject.`,
      link: "/parent/courses",
    })),
  );
}

export function notifyTeacherApprovalStatus(teacherId: string, approved: boolean) {
  return safe("teacher approval status", async () => {
    await createNotification({
      recipientId: teacherId,
      recipientRole: R.TEACHER,
      type: approved ? T.TEACHER_APPROVED : T.TEACHER_REJECTED,
      title: approved ? "You're approved!" : "Application rejected",
      message: approved
        ? "Your teacher application was approved — you can now create courses."
        : "Your teacher application was rejected.",
      link: approved ? "/teacher/course-management" : "/teacher/pending-approval",
    });
  });
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export function notifyChatMessage(roomId: string, senderRole: "PARENT" | "TEACHER") {
  return safe("chat message", async () => {
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: {
        parentId: true,
        teacherId: true,
        parent: { select: { firstName: true, lastName: true, visibleName: true } },
        teacher: { select: { firstName: true, lastName: true, visibleName: true } },
        course: { select: { courseTitle: true } },
      },
    });
    if (!room) return;

    const courseTitle = room.course.courseTitle || "your enrollment";

    if (senderRole === "PARENT") {
      await createNotification({
        recipientId: room.teacherId,
        recipientRole: R.TEACHER,
        type: T.CHAT_MESSAGE,
        title: "New message",
        message: `${displayName(room.parent)} sent you a message about "${courseTitle}".`,
        link: `/teacher/chat/${roomId}`,
      });
    } else {
      await createNotification({
        recipientId: room.parentId,
        recipientRole: R.PARENT,
        type: T.CHAT_MESSAGE,
        title: "New message",
        message: `${displayName(room.teacher)} sent you a message about "${courseTitle}".`,
        link: `/parent/chat/${roomId}`,
      });
    }
  });
}

// ---------------------------------------------------------------------------
// Wallet
// ---------------------------------------------------------------------------

export function notifyWalletCredited(parentId: string, amount: number, reason: string) {
  return safe("wallet credited", async () => {
    await createNotification({
      recipientId: parentId,
      recipientRole: R.PARENT,
      type: T.WALLET_CREDITED,
      title: "Wallet credited",
      message: `₹${amount.toLocaleString("en-IN")} was added to your wallet — ${reason}`,
      link: "/parent/wallet",
    });
  });
}

// ---------------------------------------------------------------------------
// Teacher Payouts (Sep 9, 2026) — Verify -> Payment Queue -> Mass-pay.
// See LedgerPayoutStatus's doc-comment in schema.prisma for the full
// state machine these correspond to.
// ---------------------------------------------------------------------------

/** Accounts held or rejected a payout — notifies the Teacher, and every Admin (it now needs their review). */
export function notifyPayoutHeldOrRejected(
  teacherId: string,
  action: "HOLD" | "REJECT",
  reason: string | undefined,
) {
  return safe("payout held or rejected", async () => {
    const held = action === "HOLD";

    await createNotification({
      recipientId: teacherId,
      recipientRole: R.TEACHER,
      type: held ? T.PAYOUT_ON_HOLD : T.PAYOUT_REJECTED,
      title: held ? "A payout was put on hold" : "A payout was rejected",
      message: held
        ? `Accounts put one of your cycle payouts on hold${reason ? ` — ${reason}` : ""}. It's been sent to Admin for review.`
        : `Accounts rejected one of your cycle payouts${reason ? ` — ${reason}` : ""}. It's been sent to Admin for review.`,
      link: "/teacher/rate-calculator",
    });

    await notifyAllAdmins({
      type: held ? T.PAYOUT_ON_HOLD : T.PAYOUT_REJECTED,
      title: held ? "A teacher payout is on hold" : "A teacher payout was rejected",
      message: `Accounts ${held ? "held" : "rejected"} a cycle payout${reason ? ` (${reason})` : ""} — needs your review.`,
      link: "/admin/payout-review",
    });
  });
}

// ---------------------------------------------------------------------------
// Bank Account Approval (Sep 10, 2026) — Teacher submits/edits ->
// every Admin gets told (same "any Admin can act" pattern as leave
// requests) -> Admin's decision notifies the Teacher back.
// ---------------------------------------------------------------------------

export function notifyBankAccountSubmitted(teacherId: string) {
  return safe("bank account submitted", async () => {
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { firstName: true, lastName: true, visibleName: true },
    });
    if (!teacher) return;

    await notifyAllAdmins({
      type: T.BANK_ACCOUNT_SUBMITTED,
      title: "Bank details submitted for review",
      message: `${displayName(teacher)} submitted payout bank details for approval.`,
      link: "/admin/bank-accounts",
    });
  });
}

export function notifyBankAccountReviewed(
  teacherId: string,
  approved: boolean,
  rejectionReason?: string | null,
) {
  return safe("bank account reviewed", async () => {
    await createNotification({
      recipientId: teacherId,
      recipientRole: R.TEACHER,
      type: approved ? T.BANK_ACCOUNT_APPROVED : T.BANK_ACCOUNT_REJECTED,
      title: approved ? "Bank details approved" : "Bank details rejected",
      message: approved
        ? "Your payout bank details were approved by Admin. You're now eligible for payouts."
        : `Your payout bank details were rejected by Admin${rejectionReason ? ` — ${rejectionReason}` : ""}. Please review and resubmit.`,
      link: "/teacher/bank-account",
    });
  });
}

/** Accounts mass-paid one or more teachers. */
export function notifyPayoutPaid(teacherId: string, amount: number, cycleCount: number) {
  return safe("payout paid", async () => {
    await createNotification({
      recipientId: teacherId,
      recipientRole: R.TEACHER,
      type: T.PAYOUT_PAID,
      title: "Payout sent",
      message: `₹${amount.toLocaleString("en-IN")} for ${cycleCount} completed cycle${cycleCount === 1 ? "" : "s"} has been paid out.`,
      link: "/teacher/rate-calculator",
    });
  });
}

// ---------------------------------------------------------------------------
// Complaints (Sep 10, 2026) — Parent/Teacher raises -> Admin resolves.
// See the `Complaint` model's doc-comment in schema.prisma.
// ---------------------------------------------------------------------------

/** A Parent or Teacher raised a new complaint — every Admin gets told (same "any Admin can act" pattern as leave requests). */
export function notifyComplaintSubmitted(input: {
  raiserRole: ComplainantRole;
  raiserName: string | null;
  subject: string;
}) {
  return safe("complaint submitted", async () => {
    const roleLabel = input.raiserRole === ComplainantRole.PARENT ? "A parent" : "A teacher";

    await notifyAllAdmins({
      type: T.COMPLAINT_SUBMITTED,
      title: "New complaint",
      message: `${input.raiserName ?? roleLabel} raised a complaint: "${input.subject}".`,
      link: "/admin/complaints",
    });
  });
}

const COMPLAINT_STATUS_COPY: Record<string, string> = {
  IN_PROGRESS: "is now being looked into",
  RESOLVED: "has been resolved",
  CLOSED: "has been closed",
};

/** Admin moved a complaint along — notifies whichever role (Parent or Teacher) raised it. */
export function notifyComplaintResolved(input: {
  raiserId: string;
  raiserRole: ComplainantRole;
  status: ComplaintStatus;
}) {
  return safe("complaint responded", async () => {
    const recipientRole = input.raiserRole === ComplainantRole.PARENT ? R.PARENT : R.TEACHER;
    const link = input.raiserRole === ComplainantRole.PARENT ? "/parent/complain" : "/teacher/complain";

    await createNotification({
      recipientId: input.raiserId,
      recipientRole,
      type: T.COMPLAINT_RESOLVED,
      title: "Complaint update",
      message: `Your complaint ${COMPLAINT_STATUS_COPY[input.status] ?? "was updated"} by Admin.`,
      link,
    });
  });
}

/**
 * A Parent submitted a Review (see `review.service.ts`) — notifies
 * the Teacher whose course/teaching it's about.
 */
export function notifyReviewSubmitted(reviewId: string) {
  return safe("review submitted", async () => {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: {
        rating: true,
        teacherId: true,
        parent: { select: { firstName: true, lastName: true, visibleName: true } },
        course: { select: { courseTitle: true } },
      },
    });
    if (!review) return;

    const parentName = displayName(review.parent);
    const courseTitle = review.course.courseTitle || "your course";

    await createNotification({
      recipientId: review.teacherId,
      recipientRole: R.TEACHER,
      type: T.REVIEW_SUBMITTED,
      title: "New review",
      message: `${parentName} left a ${review.rating}-star review for ${courseTitle}.`,
      link: "/teacher/course-management",
    });
  });
}

// ---------------------------------------------------------------------------
// Session follow-ups and leave shifts (Part 1C)
// ---------------------------------------------------------------------------

export interface SessionFollowUpNotice {
  sessionId: string;
  /** The outcome that caused the follow-up. */
  outcome: "TEACHER_NO_SHOW" | "STUDENT_NO_SHOW" | "NOBODY_JOINED" | "TEACHER_CANCELLED";
  /** When the make-up starts, or null if none was created. */
  makeupStartsAt: Date | null;
  /** True when a make-up was wanted but no slot fits inside the 45-day window. */
  makeupWanted: boolean;
  strikeRecorded: boolean;
}

/**
 * One call per applied follow-up (the caller only invokes it for the
 * request that actually applied it, so nothing here can double-send):
 * the parent hears what happened and what replaces the class, the
 * teacher hears about a make-up or strike, and Admin is alerted to a
 * teacher no-show. Uses the existing in-app notification feed.
 */
export function notifySessionFollowUp(notice: SessionFollowUpNotice) {
  return safe("session follow-up", async () => {
    const session = await prisma.classSession.findUnique({
      where: { id: notice.sessionId },
      select: {
        parentId: true,
        teacherId: true,
        startsAt: true,
        scheduledDate: true,
        enrollment: { select: { course: { select: { courseTitle: true } } } },
        student: { select: { firstName: true, visibleName: true } },
        teacher: { select: { firstName: true, lastName: true, visibleName: true } },
      },
    });
    if (!session) return;

    const courseTitle = session.enrollment.course.courseTitle || "the course";
    const classWhen = session.startsAt
      ? formatPlatformTime(session.startsAt, true)
      : session.scheduledDate.toISOString().slice(0, 10);
    const makeupWhen = notice.makeupStartsAt ? formatPlatformTime(notice.makeupStartsAt, true) : null;
    const teacherName = displayName(session.teacher);
    const studentName = displayName(session.student);

    const makeupLine = makeupWhen
      ? ` A make-up class is scheduled for ${makeupWhen}.`
      : notice.makeupWanted
        ? " No make-up slot fits inside this cycle's 45-day window, so this class will not be counted."
        : "";

    if (notice.outcome === "STUDENT_NO_SHOW") {
      await createNotification({
        recipientId: session.parentId,
        recipientRole: R.PARENT,
        type: T.SESSION_STUDENT_NO_SHOW,
        title: "Class missed",
        message: `${studentName} did not join the ${classWhen} class for "${courseTitle}". The class still counts toward this cycle.`,
        link: "/parent/calendar",
      });
      return;
    }

    const parentMessage =
      notice.outcome === "TEACHER_NO_SHOW"
        ? `${teacherName} did not join the ${classWhen} class for "${courseTitle}".${makeupLine}`
        : notice.outcome === "NOBODY_JOINED"
          ? `Nobody joined the ${classWhen} class for "${courseTitle}", so it was cancelled.${makeupLine}`
          : `${teacherName} cancelled the ${classWhen} class for "${courseTitle}".${makeupLine}`;

    await createNotification({
      recipientId: session.parentId,
      recipientRole: R.PARENT,
      type: makeupWhen ? T.SESSION_MAKEUP_SCHEDULED : T.SESSION_TEACHER_NO_SHOW,
      title: makeupWhen ? "Make-up class scheduled" : "Class not held",
      message: parentMessage,
      link: "/parent/calendar",
    });

    if (makeupWhen) {
      await createNotification({
        recipientId: session.teacherId,
        recipientRole: R.TEACHER,
        type: T.SESSION_MAKEUP_SCHEDULED,
        title: "Make-up class scheduled",
        message: `A make-up class for "${courseTitle}" (${studentName}) is scheduled for ${makeupWhen}.`,
        link: "/teacher/calendar",
      });
    }

    if (notice.strikeRecorded) {
      await createNotification({
        recipientId: session.teacherId,
        recipientRole: R.TEACHER,
        type: T.TEACHER_STRIKE_RECORDED,
        title: "Strike recorded",
        message:
          notice.outcome === "TEACHER_NO_SHOW"
            ? `A strike was recorded because you did not join the ${classWhen} class for "${courseTitle}".`
            : `A strike was recorded because you cancelled the ${classWhen} class for "${courseTitle}".`,
        link: "/teacher/classes",
      });
    }

    if (notice.outcome === "TEACHER_NO_SHOW") {
      await notifyAllAdmins({
        type: T.SESSION_TEACHER_NO_SHOW,
        title: "Teacher no-show",
        message: `${teacherName} did not join the ${classWhen} class for "${courseTitle}" (${studentName}). A strike was recorded.`,
        link: "/admin/teacher-directory",
      });
    }
  });
}

export interface LeaveShiftNotice {
  enrollmentId: string;
  moved: { from: Date; to: Date }[];
  /** Classes that could not be moved inside the 45-day window and were cancelled. */
  cancelled: Date[];
}

/** Tells a parent which of their classes moved because the teacher's leave was approved. */
export function notifySessionsMovedForLeave(notice: LeaveShiftNotice) {
  return safe("sessions moved for leave", async () => {
    const e = await loadEnrollmentContext(notice.enrollmentId);
    if (!e) return;

    const courseTitle = e.course.courseTitle || "your course";
    const teacherName = displayName(e.teacher);
    const parts: string[] = [];

    if (notice.moved.length > 0) {
      const shown = notice.moved
        .slice(0, 3)
        .map((m) => `${formatPlatformTime(m.from, true)} to ${formatPlatformTime(m.to, true)}`)
        .join("; ");
      const more = notice.moved.length > 3 ? ` and ${notice.moved.length - 3} more` : "";

      parts.push(`Moved: ${shown}${more}.`);
    }

    if (notice.cancelled.length > 0) {
      const shown = notice.cancelled
        .slice(0, 3)
        .map((d) => formatPlatformTime(d, true))
        .join("; ");

      parts.push(
        `Could not be moved inside this cycle's 45-day window, so they will not be counted: ${shown}.`,
      );
    }

    if (parts.length === 0) return;

    await createNotification({
      recipientId: e.parentId,
      recipientRole: R.PARENT,
      type: T.SESSION_MOVED_FOR_LEAVE,
      title: "Classes moved for teacher leave",
      message: `${teacherName} is on approved leave, so some "${courseTitle}" classes changed. ${parts.join(" ")}`,
      link: "/parent/calendar",
    });
  });
}

// ---------------------------------------------------------------------------
// After-class and disputes (Part 2A)
// ---------------------------------------------------------------------------

async function loadSessionNoticeContext(sessionId: string) {
  return prisma.classSession.findUnique({
    where: { id: sessionId },
    select: {
      parentId: true,
      teacherId: true,
      startsAt: true,
      scheduledDate: true,
      enrollment: { select: { course: { select: { courseTitle: true } } } },
      student: { select: { firstName: true, visibleName: true } },
      teacher: { select: { firstName: true, lastName: true, visibleName: true } },
    },
  });
}

function sessionWhen(session: { startsAt: Date | null; scheduledDate: Date }) {
  return session.startsAt
    ? formatPlatformTime(session.startsAt, true)
    : session.scheduledDate.toISOString().slice(0, 10);
}

/** A parent reported a problem — every Admin gets it in their queue. */
export function notifySessionOutcomeReported(sessionId: string) {
  return safe("session outcome reported", async () => {
    const session = await loadSessionNoticeContext(sessionId);
    if (!session) return;

    const courseTitle = session.enrollment.course.courseTitle || "the course";

    await notifyAllAdmins({
      type: T.SESSION_OUTCOME_REPORTED,
      title: "Class outcome reported",
      message: `A parent reported a problem with the ${sessionWhen(session)} class for "${courseTitle}" (${displayName(session.student)} with ${displayName(session.teacher)}).`,
      link: "/admin/session-reviews",
    });
  });
}

/** Both joined for under half the class — Admin has to decide. */
export function notifySessionNeedsReview(sessionId: string) {
  return safe("session needs review", async () => {
    const session = await loadSessionNoticeContext(sessionId);
    if (!session) return;

    const courseTitle = session.enrollment.course.courseTitle || "the course";

    await notifyAllAdmins({
      type: T.SESSION_NEEDS_REVIEW,
      title: "Class needs review",
      message: `The ${sessionWhen(session)} class for "${courseTitle}" (${displayName(session.student)} with ${displayName(session.teacher)}) ran for under half its time and needs an outcome.`,
      link: "/admin/session-reviews",
    });
  });
}

export interface SessionOutcomeDecidedNotice {
  sessionId: string;
  /** Plain-English outcome, e.g. "Completed". */
  outcomeLabel: string;
  changed: boolean;
  kind: "DECISION" | "OVERRIDE";
}

/** Admin decided (or overrode) an outcome — tell the parent and the teacher. */
export function notifySessionOutcomeDecided(notice: SessionOutcomeDecidedNotice) {
  return safe("session outcome decided", async () => {
    const session = await loadSessionNoticeContext(notice.sessionId);
    if (!session) return;

    const courseTitle = session.enrollment.course.courseTitle || "the course";
    const when = sessionWhen(session);

    const result = notice.changed
      ? `An Admin reviewed it and recorded it as: ${notice.outcomeLabel}.`
      : `An Admin reviewed it and the recorded outcome (${notice.outcomeLabel}) stands.`;

    const title = notice.kind === "OVERRIDE" ? "Class outcome changed" : "Class reviewed";

    await createNotification({
      recipientId: session.parentId,
      recipientRole: R.PARENT,
      type: T.SESSION_OUTCOME_DECIDED,
      title,
      message: `The ${when} class for "${courseTitle}": ${result}`,
      link: `/parent/classes/${notice.sessionId}/join`,
    });

    await createNotification({
      recipientId: session.teacherId,
      recipientRole: R.TEACHER,
      type: T.SESSION_OUTCOME_DECIDED,
      title,
      message: `The ${when} class for "${courseTitle}" (${displayName(session.student)}): ${result}`,
      link: `/teacher/classes/${notice.sessionId}/start`,
    });
  });
}

