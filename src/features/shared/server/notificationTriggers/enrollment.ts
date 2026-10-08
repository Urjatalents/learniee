import {
    createNotification,
    notifyAllAdmins
} from "@/features/shared/server/notification.service";
import "server-only";
import { R, T, displayName, loadEnrollmentContext, safe } from './shared';

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
