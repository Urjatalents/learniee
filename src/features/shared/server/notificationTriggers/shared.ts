import { prisma } from "@/lib/prisma";
import {
    NotificationRecipientRole,
    NotificationType
} from "@prisma/client";
import "server-only";

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

export async function safe(label: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (err) {
    console.error(`Notification trigger failed (${label}):`, err);
  }
}
export const R = NotificationRecipientRole;
export const T = NotificationType;
/** Small display-name helper — visibleName wins, else first+last. */
export function displayName(p: {
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
export async function loadEnrollmentContext(enrollmentId: string) {
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
