import {
    createNotification,
    createNotifications,
    notifyAllAdmins,
} from "@/features/shared/server/notification.service";
import { formatPlatformTime } from "@/lib/platformTime";
import { prisma } from "@/lib/prisma";
import "server-only";
import { R, T, displayName, safe } from './shared';

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
export function notifyTeacherApprovalStatus(
  teacherId: string,
  approved: boolean,
  reapplyAvailableAt?: Date | null,
) {
  return safe("teacher approval status", async () => {
    const reapplyText = reapplyAvailableAt
      ? ` You can appeal after ${reapplyAvailableAt.toLocaleDateString("en-IN", {
          timeZone: "Asia/Kolkata",
          day: "numeric",
          month: "short",
          year: "numeric",
        })}.`
      : "";

    await createNotification({
      recipientId: teacherId,
      recipientRole: R.TEACHER,
      type: approved ? T.TEACHER_APPROVED : T.TEACHER_REJECTED,
      title: approved ? "You're approved!" : "Application not approved",
      message: approved
        ? "Your teacher application was approved — you can now create courses."
        : `Your teacher application was not approved.${reapplyText}`,
      link: approved ? "/teacher/course-management" : "/teacher/pending-approval",
    });
  });
}
export function notifyTeacherInterviewScheduled(
  teacherId: string,
  scheduledAt: Date,
  details: string | null,
) {
  return safe("teacher interview scheduled", async () => {
    await createNotification({
      recipientId: teacherId,
      recipientRole: R.TEACHER,
      type: T.TEACHER_INTERVIEW_SCHEDULED,
      title: "Interview scheduled",
      message: `Your interview is on ${formatPlatformTime(scheduledAt, true)} (IST).${
        details ? ` ${details}` : ""
      }`,
      link: "/teacher/pending-approval",
    });
  });
}
export function notifyAdminsTeacherAppealed(teacherName: string, teacherId: string) {
  return safe("teacher appealed", async () => {
    await notifyAllAdmins({
      type: T.TEACHER_APPEALED,
      title: "Teacher appeal received",
      message: `${teacherName} has appealed and is waiting for review.`,
      link: `/admin/teachers/${teacherId}`,
    });
  });
}
