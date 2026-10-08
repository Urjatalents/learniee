import {
    isStartDateInPast
} from "@/features/shared/utils/cyclePlan";
import {
    dateToCalendarDate,
    todayInPlatformTz
} from "@/lib/platformTime";
import { prisma } from "@/lib/prisma";
import { type Enrollment } from "@prisma/client";

/**
 * Sequential dual-approval workflow (resolves 06-OPEN-DECISIONS.md
 * #2, per direct clarification Sep 1, 2026):
 *
 *   PENDING_TEACHER_APPROVAL
 *     -> (Teacher approves as-is)        -> PENDING_ADMIN_APPROVAL
 *     -> (Teacher proposes a revision)   -> PENDING_PARENT_RECONFIRMATION
 *     -> (Teacher rejects)               -> REJECTED
 *
 *   PENDING_PARENT_RECONFIRMATION
 *     -> (Parent confirms the revision)  -> PENDING_ADMIN_APPROVAL
 *     -> (Parent declines)               -> CANCELLED
 *
 *   PENDING_ADMIN_APPROVAL
 *     -> (Admin approves)                -> ACTIVE
 *     -> (Admin rejects)                 -> REJECTED   (terminal — no bounce back to Teacher)
 *
 * The enrollment's ChatRoom is the sole Parent<->Teacher channel
 * throughout — any date/session discussion happens there, this
 * service only records the outcome (see `revisionNote`).
 *
 * CYCLE MODEL (Part 1A, Sep 2026): for non-legacy enrollments
 * (`isLegacy = false`) a revision means proposing a different
 * schedule and/or start date — the session count and price are
 * recalculated from that (`reviseCycleEnrollment`), the Teacher can
 * no longer type a session count, all sessions are created at Admin
 * approval, and the schedule can't be edited afterwards. A start
 * date that has already passed blocks both approvals until it is
 * revised. Legacy enrollments keep the original behavior below.
 */

/** True once the cycle's start date (a platform-timezone calendar date) is before today. */
export function cycleStartHasPassed(enrollment: Pick<Enrollment, "cycleStartDate">) {
  return isStartDateInPast(
    dateToCalendarDate(enrollment.cycleStartDate),
    todayInPlatformTz(),
  );
}
export const START_PASSED_MESSAGE =
  "This enrollment's start date has already passed. It has to be revised with a new start date before it can be approved.";
export class EnrollmentApprovalError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
export const enrollmentListInclude = {
  student: {
    select: { id: true, firstName: true, lastName: true, visibleName: true },
  },
  parent: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      visibleName: true,
      email: true,
      phone: true,
    },
  },
  teacher: {
    select: { id: true, firstName: true, lastName: true, visibleName: true },
  },
  course: { select: { id: true, courseTitle: true, subject: true } },
  chatRoom: { select: { id: true } },
} as const;
export async function loadOwnedByTeacher(enrollmentId: string, teacherId: string) {
  const enrollment = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, teacherId },
  });

  if (!enrollment) {
    throw new EnrollmentApprovalError(
      "Enrollment not found, or doesn't belong to you.",
      404,
    );
  }

  return enrollment;
}
export const SCHEDULE_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
