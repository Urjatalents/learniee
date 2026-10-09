import {
    cycleDeadlineDate,
    formatDayMonth,
    isWithinCycleDeadline,
} from "@/features/shared/utils/cyclePlan";
import { hasCancelNotice } from "@/features/shared/utils/sessionOutcome";
import { SESSION_POLICY } from "@/lib/platformConfig";
import {
    addDays,
    calendarDateToDate,
    compareDates,
    dateToCalendarDate,
    formatPlatformTime,
    isValidTimeOfDay,
    platformWallClockToUtc,
    type CalendarDate
} from "@/lib/platformTime";
import { prisma } from "@/lib/prisma";
import {
    ClassSessionStatus,
    LeaveRequestStatus,
    RescheduleRequestStatus
} from "@prisma/client";
import "server-only";

/**
 * Reschedule requests for one already-scheduled `ClassSession` — see
 * the `RescheduleRequest` model's doc-comment in `schema.prisma` for
 * the full picture. Single-step approval, independent of
 * Enrollment's own dual-approval workflow:
 *
 *   Parent proposes  -> PENDING_TEACHER_APPROVAL -> Teacher approves/rejects
 *   Teacher proposes -> PENDING_PARENT_APPROVAL  -> Parent approves/rejects
 *
 * Approving moves the underlying ClassSession's own
 * scheduledDate/scheduledTime — there's no separate "old"/"new"
 * session row, the same row just moves. The requester can also
 * withdraw a still-pending request before the other side responds.
 *
 * Cycle-model sessions (Part 1B) add two rules on top, checked when
 * a request is proposed AND again when it is approved
 * (`assertCycleSlotAllowed`): the class must still be at least 4
 * hours from starting, and the new slot must fall on or before the
 * cycle deadline (45 days after the cycle start, day 1 = start
 * date). Legacy sessions are unchanged.
 */

export class RescheduleRequestError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
export type ActorRole = "TEACHER" | "PARENT";
export const PENDING_STATUSES: RescheduleRequestStatus[] = [
  RescheduleRequestStatus.PENDING_TEACHER_APPROVAL,
  RescheduleRequestStatus.PENDING_PARENT_APPROVAL,
];
/** Same "date-only, local midnight" convention ClassSession.scheduledDate uses. */
export function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
export function parseDateOnly(value: string): Date {
  // Accepts "YYYY-MM-DD" (a plain <input type="date"> value) as well
  // as a full ISO string — either way we only keep the calendar date,
  // same as classSession.service.ts's own startOfDay() usage.
  const parsed = new Date(value.length <= 10 ? `${value}T00:00:00` : value);

  if (Number.isNaN(parsed.getTime())) {
    throw new RescheduleRequestError("Invalid proposed date.");
  }

  return startOfDay(parsed);
}
export function assertValidTime(time?: string | null) {
  if (time == null || time === "") return null;

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new RescheduleRequestError('Proposed time must be in "HH:mm" format.');
  }

  return time;
}
type CycleSession = {
  id: string;
  cycleId: string | null;
  startsAt: Date | null;
  scheduledTime: string | null;
};
export function isCycleModelSession(
  session: CycleSession,
): session is CycleSession & { cycleId: string; startsAt: Date } {
  return session.cycleId !== null && session.startsAt !== null;
}
/**
 * The two Part 1B reschedule rules for a cycle-model session, given
 * the slot being asked for (`proposedDate` is a platform-timezone
 * calendar date; a missing time keeps the session's own).
 *
 *   1. Only up to 4 hours before the class starts.
 *   2. Only to a slot on or before the cycle deadline (45 days after
 *      the cycle start, day 1 = start date).
 */
export async function assertCycleSlotAllowed(
  session: CycleSession & { cycleId: string; startsAt: Date },
  proposedDate: CalendarDate,
  proposedTime: string | null,
  now: Date,
) {
  if (!hasCancelNotice(session.startsAt, now)) {
    throw new RescheduleRequestError(
      `A class can only be rescheduled up to ${SESSION_POLICY.cancelNoticeHours} hours before it starts.`,
      409,
    );
  }

  const time = proposedTime ?? session.scheduledTime;

  if (!isValidTimeOfDay(time)) {
    throw new RescheduleRequestError("A class time is required to reschedule this class.");
  }

  if (platformWallClockToUtc(proposedDate, time) <= now) {
    throw new RescheduleRequestError("Proposed date and time can't be in the past.");
  }

  const cycle = await prisma.enrollmentCycle.findUnique({
    where: { id: session.cycleId },
    select: { startDate: true, status: true },
  });

  // Part 1C: nothing can be scheduled or extended once a cycle has closed.
  if (cycle && cycle.status === "CLOSED") {
    throw new RescheduleRequestError(
      "This cycle has closed, so its classes can no longer be rescheduled.",
      409,
    );
  }

  if (cycle) {
    const cycleStart = dateToCalendarDate(cycle.startDate);

    if (!isWithinCycleDeadline(proposedDate, cycleStart)) {
      throw new RescheduleRequestError(
        `Classes can only be moved to a slot on or before ${formatDayMonth(
          cycleDeadlineDate(cycleStart),
        )} — the end of this cycle's ${SESSION_POLICY.completionWindowDays}-day window.`,
        409,
      );
    }
  }
}
/**
 * Phase 1.1: the slot must not fall inside the teacher's approved
 * leave. Checked when a request is proposed and again when it is
 * approved. `proposedDate` is the saved calendar date (UTC midnight).
 */
export async function assertNotOnTeacherLeave(teacherId: string, proposedDate: Date) {
  const day = dateToCalendarDate(proposedDate);

  // Widened by a day each side, then compared on calendar dates
  // (same approach as loadSlotContext).
  const leaves = await prisma.leaveRequest.findMany({
    where: {
      teacherId,
      status: LeaveRequestStatus.APPROVED,
      startDate: { lte: calendarDateToDate(addDays(day, 1)) },
      endDate: { gte: calendarDateToDate(addDays(day, -1)) },
    },
    select: { startDate: true, endDate: true },
  });

  const onLeave = leaves.some(
    (leave) =>
      compareDates(day, dateToCalendarDate(leave.startDate)) >= 0 &&
      compareDates(day, dateToCalendarDate(leave.endDate)) <= 0,
  );

  if (onLeave) {
    throw new RescheduleRequestError(
      "The teacher is on approved leave on that date. Please pick another date.",
      409,
    );
  }
}

/** Phase 1.4: a class can only be moved by an approved reschedule so many times. */
export async function assertUnderRescheduleCap(classSessionId: string) {
  const approved = await prisma.rescheduleRequest.count({
    where: { classSessionId, status: RescheduleRequestStatus.APPROVED },
  });

  if (approved >= SESSION_POLICY.maxReschedulesPerSession) {
    throw new RescheduleRequestError(
      `This class has already been rescheduled ${SESSION_POLICY.maxReschedulesPerSession} times and can't be moved again. Please keep the current time or cancel the class.`,
      409,
    );
  }
}

/**
 * Phase 1.5: at approval, the slot must still be free — no overlap
 * with another scheduled class of this teacher or student. The
 * request is left pending on failure so the proposer can withdraw it
 * and propose a new slot (or it expires at class start).
 */
export async function assertSlotStillFree(
  session: { id: string; teacherId: string; studentId: string; lengthMinutes: number | null },
  proposedDate: CalendarDate,
  time: string,
) {
  if (!session.lengthMinutes) return;

  const startsAt = platformWallClockToUtc(proposedDate, time);
  const endsAt = new Date(startsAt.getTime() + session.lengthMinutes * 60_000);

  const clash = await prisma.classSession.findFirst({
    where: {
      id: { not: session.id },
      status: ClassSessionStatus.SCHEDULED,
      OR: [{ teacherId: session.teacherId }, { studentId: session.studentId }],
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
    select: { id: true },
  });

  if (clash) {
    throw new RescheduleRequestError(
      `That slot (${formatPlatformTime(startsAt, true)}) is no longer free because another class overlaps it. This request is still pending, so you can reject or withdraw it and propose a different time.`,
      409,
    );
  }
}

export const requestInclude = {
  classSession: {
    select: { id: true, scheduledDate: true, scheduledTime: true, status: true },
  },
  enrollment: {
    select: {
      id: true,
      subject: true,
      course: { select: { id: true, courseTitle: true } },
    },
  },
  teacher: {
    select: { id: true, firstName: true, lastName: true, visibleName: true },
  },
  parent: {
    select: { id: true, firstName: true, lastName: true, visibleName: true },
  },
} as const;
