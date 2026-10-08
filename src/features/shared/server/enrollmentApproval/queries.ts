import { prisma } from "@/lib/prisma";
import { EnrollmentStatus } from "@prisma/client";
import { enrollmentListInclude } from './base';

/**
 * Enrollments this Teacher needs to see: still in the approval
 * queue, already ACTIVE (added Sep 3, 2026 alongside cycle
 * progress — a Teacher needs to see ACTIVE enrollments to mark
 * sessions complete, not just pending ones), or COMPLETED (added
 * for the "My Classes"-style teacher page, so a finished cycle's
 * history/roster entry doesn't just disappear).
 */
export function getEnrollmentsForTeacher(teacherId: string) {
  return prisma.enrollment.findMany({
    where: {
      teacherId,
      status: {
        in: [
          EnrollmentStatus.PENDING_TEACHER_APPROVAL,
          EnrollmentStatus.PENDING_PARENT_RECONFIRMATION,
          EnrollmentStatus.PENDING_ADMIN_APPROVAL,
          EnrollmentStatus.ACTIVE,
          EnrollmentStatus.LAPSED,
          EnrollmentStatus.COMPLETED,
        ],
      },
    },
    include: enrollmentListInclude,
    orderBy: { createdAt: "desc" },
  });
}
/** Enrollments waiting on Admin's review — the Admin action queue. */
export function getEnrollmentsForAdmin() {
  return prisma.enrollment.findMany({
    where: { status: EnrollmentStatus.PENDING_ADMIN_APPROVAL },
    include: enrollmentListInclude,
    orderBy: { createdAt: "desc" },
  });
}
