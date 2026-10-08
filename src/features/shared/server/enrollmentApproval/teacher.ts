import {
    notifyEnrollmentRejected,
    notifyEnrollmentRevisionProposed,
    notifyEnrollmentTeacherApproved
} from "@/features/shared/server/notificationTriggers.service";
import { prisma } from "@/lib/prisma";
import { EnrollmentStatus } from "@prisma/client";
import { EnrollmentApprovalError, SCHEDULE_TIME_PATTERN, START_PASSED_MESSAGE, cycleStartHasPassed, loadOwnedByTeacher } from './base';
import { reviseCycleEnrollment } from './cycleRevise';

/** Teacher approves the enrollment exactly as the Parent paid for it. */
export async function teacherApproveEnrollment(
  enrollmentId: string,
  teacherId: string,
) {
  const enrollment = await loadOwnedByTeacher(enrollmentId, teacherId);

  if (enrollment.status !== EnrollmentStatus.PENDING_TEACHER_APPROVAL) {
    throw new EnrollmentApprovalError(
      "This enrollment isn't waiting on your review anymore.",
      409,
    );
  }

  if (!enrollment.isLegacy && cycleStartHasPassed(enrollment)) {
    throw new EnrollmentApprovalError(
      `${START_PASSED_MESSAGE} Use "Propose a change" to set a new start date.`,
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

  await notifyEnrollmentTeacherApproved(enrollmentId);

  return updated;
}
export interface TeacherReviseInput {
  cycleStartDate?: string;
  sessionsPerMonth?: number;
  /** Weekly recurring class days — 0=Sunday..6=Saturday. */
  scheduleDays?: number[];
  /** Weekly recurring class time, 24-hour "HH:mm". */
  scheduleTime?: string;
  note: string;
}
/**
 * Teacher proposes a schedule/cycle change. `cycleStartDate` is
 * always safe to change (no cost impact — `dueDate` is simply
 * recalculated from it). `sessionsPerMonth` changes the price
 * (`monthlyRate`/`totalAmount`) — those are recalculated for the
 * record, but `amountPaid` (what Razorpay actually charged) is
 * NEVER touched here. If the new total no longer matches what was
 * paid, `pricingChangedAfterPayment` flips true so Admin sees a
 * clear flag instead of a silent mismatch — no automatic extra
 * charge or refund happens (that needs a manual/Razorpay-side
 * follow-up, out of scope here).
 */
export async function teacherReviseEnrollment(
  enrollmentId: string,
  teacherId: string,
  input: TeacherReviseInput,
) {
  const enrollment = await loadOwnedByTeacher(enrollmentId, teacherId);

  if (!enrollment.isLegacy) {
    return reviseCycleEnrollment(enrollment, input);
  }

  if (enrollment.status !== EnrollmentStatus.PENDING_TEACHER_APPROVAL) {
    throw new EnrollmentApprovalError(
      "This enrollment isn't waiting on your review anymore.",
      409,
    );
  }

  if (!input.note?.trim()) {
    throw new EnrollmentApprovalError(
      "Add a short note explaining the change — the parent will see this.",
    );
  }

  const data: Record<string, unknown> = {
    revisedByTeacher: true,
    revisionNote: input.note.trim().slice(0, 1000),
    status: EnrollmentStatus.PENDING_PARENT_RECONFIRMATION,
  };

  let cycleStartDate = enrollment.cycleStartDate;

  if (input.cycleStartDate) {
    const parsed = new Date(input.cycleStartDate);

    if (Number.isNaN(parsed.getTime())) {
      throw new EnrollmentApprovalError("That doesn't look like a valid date.");
    }

    cycleStartDate = parsed;
    const dueDate = new Date(parsed);
    dueDate.setMonth(dueDate.getMonth() + 1);

    data.cycleStartDate = cycleStartDate;
    data.dueDate = dueDate;
  }

  if (input.sessionsPerMonth) {
    if (
      !Number.isInteger(input.sessionsPerMonth) ||
      input.sessionsPerMonth < 4 ||
      input.sessionsPerMonth > 31
    ) {
      throw new EnrollmentApprovalError(
        "sessionsPerMonth must be a whole number between 4 and 31.",
      );
    }

    const monthlyRate = Number(enrollment.ratePerSession) * input.sessionsPerMonth;
    const totalAmount = monthlyRate * enrollment.noOfMonths;

    data.sessionsPerMonth = input.sessionsPerMonth;
    data.monthlyRate = monthlyRate;
    data.totalAmount = totalAmount;
    data.pricingChangedAfterPayment = totalAmount !== Number(enrollment.amountPaid);
  }

  if (input.scheduleDays) {
    const scheduleDays = Array.from(new Set(input.scheduleDays)).sort(
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

    data.scheduleDays = scheduleDays;
  }

  if (input.scheduleTime) {
    if (!SCHEDULE_TIME_PATTERN.test(input.scheduleTime)) {
      throw new EnrollmentApprovalError("That doesn't look like a valid time (HH:mm).");
    }

    data.scheduleTime = input.scheduleTime;
  }

  const updated = await prisma.enrollment.update({
    where: { id: enrollmentId },
    data,
  });

  await notifyEnrollmentRevisionProposed(enrollmentId, input.note.trim());

  return updated;
}
export async function teacherRejectEnrollment(
  enrollmentId: string,
  teacherId: string,
  reason: string,
) {
  const enrollment = await loadOwnedByTeacher(enrollmentId, teacherId);

  if (
    enrollment.status !== EnrollmentStatus.PENDING_TEACHER_APPROVAL &&
    enrollment.status !== EnrollmentStatus.PENDING_PARENT_RECONFIRMATION
  ) {
    throw new EnrollmentApprovalError(
      "This enrollment isn't waiting on you anymore.",
      409,
    );
  }

  const updated = await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      status: EnrollmentStatus.REJECTED,
      rejectedBy: "TEACHER",
      rejectionReason: reason?.trim().slice(0, 1000) || null,
    },
  });

  await notifyEnrollmentRejected(enrollmentId, "TEACHER");

  return updated;
}
