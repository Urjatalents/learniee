import {
    ClassSessionError,
    createCycleSessions,
    generateSessionsForEnrollment,
    regenerateFutureSessions,
} from "@/features/shared/server/classSession.service";
import {
    notifyEnrollmentActivated,
    notifyEnrollmentRejected
} from "@/features/shared/server/notificationTriggers.service";
import { prisma } from "@/lib/prisma";
import { EnrollmentStatus } from "@prisma/client";
import { EnrollmentApprovalError, SCHEDULE_TIME_PATTERN, START_PASSED_MESSAGE, cycleStartHasPassed, loadOwnedByTeacher } from './base';

async function loadPendingAdminReview(enrollmentId: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
  });

  if (!enrollment) {
    throw new EnrollmentApprovalError("Enrollment not found.", 404);
  }

  return enrollment;
}
/** Admin approves — final step, enrollment goes ACTIVE and lectures can be scheduled. */
export async function adminApproveEnrollment(enrollmentId: string) {
  const enrollment = await loadPendingAdminReview(enrollmentId);

  if (enrollment.status !== EnrollmentStatus.PENDING_ADMIN_APPROVAL) {
    throw new EnrollmentApprovalError(
      "This enrollment isn't waiting on admin approval.",
      409,
    );
  }

  if (!enrollment.isLegacy) {
    if (cycleStartHasPassed(enrollment)) {
      throw new EnrollmentApprovalError(
        `${START_PASSED_MESSAGE} Ask the teacher to propose a new start date.`,
        409,
      );
    }

    // Cycle model: the enrollment only becomes ACTIVE if all of its
    // cycle-1 sessions were created too — one transaction, so a
    // failure leaves it pending instead of active-with-no-classes.
    let activated;

    try {
      activated = await prisma.$transaction(async (tx) => {
        const row = await tx.enrollment.update({
          where: { id: enrollmentId },
          data: {
            adminApprovedAt: new Date(),
            status: EnrollmentStatus.ACTIVE,
          },
        });

        await createCycleSessions(tx, enrollmentId, 1);

        return row;
      });
    } catch (err) {
      if (err instanceof ClassSessionError) {
        throw new EnrollmentApprovalError(err.message, err.status);
      }

      throw err;
    }

    await notifyEnrollmentActivated(enrollmentId);

    return activated;
  }

  const updated = await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      adminApprovedAt: new Date(),
      status: EnrollmentStatus.ACTIVE,
    },
  });

  // Schedule is set by the Parent at Enrollment creation
  // (parent/server/enrollment.service.ts), so it's already known
  // here — generate the first batch of real, dated ClassSession
  // rows now that lectures can actually be scheduled. No-ops if
  // scheduleDays somehow ended up empty. See classSession.service.ts.
  await generateSessionsForEnrollment(updated);
  await notifyEnrollmentActivated(enrollmentId);

  return updated;
}
const SET_SCHEDULE_STATUSES: EnrollmentStatus[] = [
  EnrollmentStatus.ACTIVE,
  EnrollmentStatus.LAPSED,
];
/**
 * Lets a Teacher set/correct the weekly recurring schedule on an
 * enrollment that's already ACTIVE (or LAPSED) — i.e. fully
 * approved, with no cost/approval impact, so it doesn't need to go
 * through `teacherReviseEnrollment`'s Parent-reconfirmation flow.
 *
 * Exists for two cases: (1) enrollments created before
 * `scheduleDays`/`scheduleTime` existed on the schema default to an
 * empty schedule and otherwise have no way to ever get one, and (2)
 * simple corrections (wrong day/time typed at enrollment) that
 * don't warrant a full revision-and-reconfirm round trip. The
 * calendar (`scheduleOccurrences.service.ts`) reads straight off
 * these two fields, so this is what unblocks a "why isn't my
 * enrolled student showing on the calendar" case for old rows.
 */
export async function setEnrollmentSchedule(
  enrollmentId: string,
  teacherId: string,
  input: { scheduleDays: number[]; scheduleTime: string },
) {
  const enrollment = await loadOwnedByTeacher(enrollmentId, teacherId);

  if (!enrollment.isLegacy) {
    throw new EnrollmentApprovalError(
      "The schedule can't be edited mid-cycle. Use a reschedule request to move an individual class.",
      409,
    );
  }

  if (!SET_SCHEDULE_STATUSES.includes(enrollment.status)) {
    throw new EnrollmentApprovalError(
      "Schedule can only be set on an active enrollment.",
      409,
    );
  }

  const scheduleDays = Array.from(new Set(input.scheduleDays ?? [])).sort(
    (a, b) => a - b,
  );

  if (
    scheduleDays.length === 0 ||
    scheduleDays.some((d) => !Number.isInteger(d) || d < 0 || d > 6)
  ) {
    throw new EnrollmentApprovalError(
      "Pick at least one valid day of the week.",
    );
  }

  if (!input.scheduleTime || !SCHEDULE_TIME_PATTERN.test(input.scheduleTime)) {
    throw new EnrollmentApprovalError("That doesn't look like a valid time (HH:mm).");
  }

  const updated = await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: { scheduleDays, scheduleTime: input.scheduleTime },
  });

  // Future SCHEDULED sessions were generated off the old
  // schedule (or none existed yet) — drop and regenerate them from
  // the corrected one. Never touches COMPLETED/CANCELLED history.
  await regenerateFutureSessions(enrollmentId);

  return updated;
}
/**
 * Admin rejects — terminal, per direct instruction. Does not bounce
 * back to the Teacher even though the Teacher already approved it.
 */
export async function adminRejectEnrollment(
  enrollmentId: string,
  reason: string,
) {
  const enrollment = await loadPendingAdminReview(enrollmentId);

  if (enrollment.status !== EnrollmentStatus.PENDING_ADMIN_APPROVAL) {
    throw new EnrollmentApprovalError(
      "This enrollment isn't waiting on admin approval.",
      409,
    );
  }

  const updated = await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      status: EnrollmentStatus.REJECTED,
      rejectedBy: "ADMIN",
      rejectionReason: reason?.trim().slice(0, 1000) || null,
    },
  });

  await notifyEnrollmentRejected(enrollmentId, "ADMIN");

  return updated;
}
