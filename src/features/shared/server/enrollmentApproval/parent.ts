import {
    notifyEnrollmentRevisionConfirmed,
    notifyEnrollmentRevisionDeclined
} from "@/features/shared/server/notificationTriggers.service";
import { prisma } from "@/lib/prisma";
import { EnrollmentStatus } from "@prisma/client";
import { EnrollmentApprovalError } from './base';

async function loadOwnedByParent(enrollmentId: string, parentId: string) {
  const enrollment = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, parentId },
  });

  if (!enrollment) {
    throw new EnrollmentApprovalError(
      "Enrollment not found, or doesn't belong to your account.",
      404,
    );
  }

  return enrollment;
}
/** Parent accepts the Teacher's proposed revision — moves on to Admin. */
export async function parentConfirmRevision(
  enrollmentId: string,
  parentId: string,
) {
  const enrollment = await loadOwnedByParent(enrollmentId, parentId);

  if (enrollment.status !== EnrollmentStatus.PENDING_PARENT_RECONFIRMATION) {
    throw new EnrollmentApprovalError(
      "There's no pending revision to confirm on this enrollment.",
      409,
    );
  }

  const updated = await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      teacherApprovedAt: new Date(),
      status: EnrollmentStatus.PENDING_ADMIN_APPROVAL,
    },
  });

  await notifyEnrollmentRevisionConfirmed(enrollmentId);

  return updated;
}
/** Parent declines the Teacher's proposed revision — enrollment is cancelled. */
export async function parentDeclineRevision(
  enrollmentId: string,
  parentId: string,
) {
  const enrollment = await loadOwnedByParent(enrollmentId, parentId);

  if (enrollment.status !== EnrollmentStatus.PENDING_PARENT_RECONFIRMATION) {
    throw new EnrollmentApprovalError(
      "There's no pending revision to decline on this enrollment.",
      409,
    );
  }

  const updated = await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: { status: EnrollmentStatus.CANCELLED },
  });

  await notifyEnrollmentRevisionDeclined(enrollmentId);

  return updated;
}
