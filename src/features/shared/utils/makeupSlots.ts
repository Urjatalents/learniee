import { SESSION_POLICY } from "@/lib/platformConfig";
import {
  addDays,
  calendarDateToDate,
  compareDates,
  platformWallClockToUtc,
  toDateKey,
  weekdayOf,
  type CalendarDate,
} from "@/lib/platformTime";

/**
 * Finding the "next free slot" for a make-up or a session that has
 * to move (Part 1C). Pure — the service loads the context from the
 * database and passes it in, so the same rule is used for make-ups
 * and for leave shifts.
 *
 * A slot is one of the enrollment's own weekly class times (a chosen
 * weekday at the chosen time). It is free when:
 *   - the enrollment has no session at all on that date (the
 *     database allows one session per enrollment per date, and a
 *     cancelled session still holds its date),
 *   - the teacher is not on approved leave that day,
 *   - neither the teacher nor the student has another session that
 *     overlaps it, and
 *   - it starts at least `cancelNoticeHours` from now, so the parent
 *     can still cancel it like any other class.
 *
 * Only slots on or before the cycle deadline (day 45) are considered.
 */

const HOUR_MS = 3_600_000;

export interface SlotContext {
  /** "YYYY-MM-DD" of every date the enrollment already has a session on. */
  occupiedDateKeys: ReadonlySet<string>;
  /** Approved teacher leave, as inclusive calendar-date ranges. */
  leaves: ReadonlyArray<{ start: CalendarDate; end: CalendarDate }>;
  /** Other sessions of this teacher or student that are still SCHEDULED. */
  busy: ReadonlyArray<{ startsAt: Date; endsAt: Date }>;
}

export interface FreeSlot {
  date: CalendarDate;
  startsAt: Date;
  endsAt: Date;
}

export interface FindSlotInput {
  now: Date;
  /** First calendar date that may be used (inclusive). */
  earliest: CalendarDate;
  /** Cycle deadline day (inclusive). */
  deadline: CalendarDate;
  scheduleDays: readonly number[];
  /** "HH:mm" in the platform timezone. */
  time: string;
  lengthMinutes: number;
  context: SlotContext;
}

function isOnLeave(date: CalendarDate, leaves: SlotContext["leaves"]): boolean {
  return leaves.some(
    (leave) => compareDates(date, leave.start) >= 0 && compareDates(date, leave.end) <= 0,
  );
}

export function findNextFreeSlot(input: FindSlotInput): FreeSlot | null {
  const { now, earliest, deadline, scheduleDays, time, lengthMinutes, context } = input;
  const daySet = new Set(scheduleDays);
  const notBefore = now.getTime() + SESSION_POLICY.cancelNoticeHours * HOUR_MS;

  // Hard stop so a bad input can never loop; a cycle window is 45 days.
  for (let i = 0; i < 400; i += 1) {
    const date = addDays(earliest, i);

    if (compareDates(date, deadline) > 0) return null;
    if (!daySet.has(weekdayOf(date))) continue;
    if (context.occupiedDateKeys.has(toDateKey(date))) continue;
    if (isOnLeave(date, context.leaves)) continue;

    const startsAt = platformWallClockToUtc(date, time);
    const endsAt = new Date(startsAt.getTime() + lengthMinutes * 60_000);

    if (startsAt.getTime() < notBefore) continue;

    const clashes = context.busy.some(
      (b) => b.startsAt.getTime() < endsAt.getTime() && b.endsAt.getTime() > startsAt.getTime(),
    );

    if (clashes) continue;

    return { date, startsAt, endsAt };
  }

  return null;
}

/** The Date stored in `ClassSession.scheduledDate` for a slot. */
export function slotScheduledDate(slot: FreeSlot): Date {
  return calendarDateToDate(slot.date);
}
