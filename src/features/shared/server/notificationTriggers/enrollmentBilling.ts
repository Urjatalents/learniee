import {
    createNotification
} from "@/features/shared/server/notification.service";
import { prisma } from "@/lib/prisma";
import "server-only";
import { R, T, displayName, loadEnrollmentContext, safe } from './shared';

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
/** Part 2B: a cycle closed with no renewal — the Enrollment is done. */
export function notifyEnrollmentCompleted(enrollmentId: string) {
  return safe("enrollment completed", async () => {
    const e = await loadEnrollmentContext(enrollmentId);
    if (!e) return;

    const courseTitle = e.course.courseTitle || "your course";
    const studentName = displayName({ firstName: e.student.firstName, visibleName: e.student.visibleName });

    await createNotification({
      recipientId: e.parentId,
      recipientRole: R.PARENT,
      type: T.ENROLLMENT_COMPLETED,
      title: "Enrollment completed",
      message: `${studentName}'s last cycle in "${courseTitle}" closed with no renewal, so the enrollment is now complete. Enroll again any time to continue.`,
      link: "/parent/enrollments",
    });

    await createNotification({
      recipientId: e.teacherId,
      recipientRole: R.TEACHER,
      type: T.ENROLLMENT_COMPLETED,
      title: "Enrollment completed",
      message: `${studentName}'s enrollment in "${courseTitle}" is now complete — no renewal came in before the cycle closed.`,
      link: "/teacher/enrollments",
    });
  });
}
/** Certification: the Teacher issued a certificate — lets the Parent know it's ready to view/download. */
export function notifyCertificateIssued(enrollmentId: string) {
  return safe("certificate issued", async () => {
    const e = await loadEnrollmentContext(enrollmentId);
    if (!e) return;

    const courseTitle = e.course.courseTitle || "their course";
    const studentName = displayName({
      firstName: e.student.firstName,
      visibleName: e.student.visibleName,
    });

    await createNotification({
      recipientId: e.parentId,
      recipientRole: R.PARENT,
      type: T.CERTIFICATE_ISSUED,
      title: "Certificate issued",
      message: `${studentName} has been awarded a certificate for "${courseTitle}". View and download it from their profile.`,
      link: `/parent/students/${e.studentId}`,
    });
  });
}
/** Part 2B: a Renew payment cleared and the next cycle's sessions were created. */
export function notifyCycleRenewed(enrollmentId: string, cycleNumber: number) {
  return safe("cycle renewed", async () => {
    const e = await loadEnrollmentContext(enrollmentId);
    if (!e) return;

    const courseTitle = e.course.courseTitle || "your course";
    const studentName = displayName({ firstName: e.student.firstName, visibleName: e.student.visibleName });

    await createNotification({
      recipientId: e.parentId,
      recipientRole: R.PARENT,
      type: T.CYCLE_RENEWED,
      title: "Renewal confirmed",
      message: `Cycle ${cycleNumber} for ${studentName}'s "${courseTitle}" is booked and paid.`,
      link: "/parent/enrollments",
    });

    await createNotification({
      recipientId: e.teacherId,
      recipientRole: R.TEACHER,
      type: T.CYCLE_RENEWED,
      title: "Enrollment renewed",
      message: `${studentName}'s enrollment in "${courseTitle}" was renewed for cycle ${cycleNumber}.`,
      link: "/teacher/enrollments",
    });
  });
}
