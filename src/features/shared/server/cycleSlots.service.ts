import "server-only";

import { ClassSessionStatus, LeaveRequestStatus, type Prisma } from "@prisma/client";

import {
  addDays,
  calendarDateToDate,
  dateToCalendarDate,
  platformWallClockToUtc,
  toDateKey,
  type CalendarDate,
} from "@/lib/platformTime";
import type { SlotContext } from "@/features/shared/utils/makeupSlots";

/**
 * Database side of the "next free slot" search (Part 1C). The rule
 * itself is the pure `findNextFreeSlot` in `utils/makeupSlots.ts`;
 * this file only loads what it needs, using the caller's transaction
 * client so the read and the write that follows see the same state.
 */

/**
 * Locks one cycle row for the rest of the transaction. Everything
 * that adds a session to a cycle or closes it takes this lock first,
 * so a cycle can't close in the gap between "teacher cancelled" and
 * "make-up created", and two follow-ups can't pick the same slot.
 * The lock is released when the transaction ends.
 */
export async function lockCycle(tx: Prisma.TransactionClient, cycleId: string) {
  await tx.$queryRaw`SELECT "id" FROM "EnrollmentCycle" WHERE "id" = ${cycleId} FOR UPDATE`;
}

export interface LoadSlotContextInput {
  enrollmentId: string;
  teacherId: string;
  studentId: string;
  /** Calendar range the search may use, inclusive. */
  from: CalendarDate;
  to: CalendarDate;
  /** A session being moved — it must not block its own new slot. */
  excludeSessionId?: string;
}

export async function loadSlotContext(
  tx: Prisma.TransactionClient,
  input: LoadSlotContextInput,
): Promise<SlotContext> {
  const excludeId = input.excludeSessionId ? { id: { not: input.excludeSessionId } } : {};

  // Every date this enrollment already has a session on (a cancelled
  // session still holds its date — one session per enrollment per date).
  const sameEnrollment = await tx.classSession.findMany({
    where: {
      enrollmentId: input.enrollmentId,
      scheduledDate: { gte: calendarDateToDate(input.from), lte: calendarDateToDate(input.to) },
      ...excludeId,
    },
    select: { scheduledDate: true },
  });

  // Approved leave overlapping the range. Leave dates are saved as
  // plain dates (host TZ=UTC, see 06 #52), so the query is widened by a
  // day each side and the exact comparison is done on calendar dates.
  const leaveRows = await tx.leaveRequest.findMany({
    where: {
      teacherId: input.teacherId,
      status: LeaveRequestStatus.APPROVED,
      endDate: { gte: calendarDateToDate(addDays(input.from, -1)) },
      startDate: { lte: calendarDateToDate(addDays(input.to, 1)) },
    },
    select: { startDate: true, endDate: true },
  });

  // Other classes of this teacher or this student that could clash.
  const busyRows = await tx.classSession.findMany({
    where: {
      status: ClassSessionStatus.SCHEDULED,
      OR: [{ teacherId: input.teacherId }, { studentId: input.studentId }],
      startsAt: { lt: platformWallClockToUtc(addDays(input.to, 1), "00:00") },
      endsAt: { gt: platformWallClockToUtc(input.from, "00:00") },
      ...excludeId,
    },
    select: { startsAt: true, endsAt: true },
  });

  return {
    occupiedDateKeys: new Set(
      sameEnrollment.map((row) => toDateKey(dateToCalendarDate(row.scheduledDate))),
    ),
    leaves: leaveRows.map((row) => ({
      start: dateToCalendarDate(row.startDate),
      end: dateToCalendarDate(row.endDate),
    })),
    busy: busyRows.flatMap((row) =>
      row.startsAt && row.endsAt ? [{ startsAt: row.startsAt, endsAt: row.endsAt }] : [],
    ),
  };
}
