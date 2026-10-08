import { loadSlotContext } from "@/features/shared/server/cycleSlots.service";
import { cycleDeadlineDate } from "@/features/shared/utils/cyclePlan";
import { findNextFreeSlot, slotScheduledDate } from "@/features/shared/utils/makeupSlots";
import { DEFAULT_SESSION_LENGTH_MINUTES } from "@/lib/platformConfig";
import {
    compareDates,
    dateToCalendarDate,
    isValidTimeOfDay,
    todayInPlatformTz,
} from "@/lib/platformTime";
import {
    Prisma
} from "@prisma/client";
import "server-only";
import { FollowUpRetryLater, FollowUpSession } from './base';

/**
 * Adds one make-up session on the next free slot on or before the
 * cycle's day 45. Returns null if none fits. The make-up is a normal
 * cycle session (next session number, same teacher, student and
 * length) so Start / Join / End, reschedule and counting all work on
 * it unchanged.
 */
export async function createMakeup(
  tx: Prisma.TransactionClient,
  session: FollowUpSession,
  cycleStartDate: Date,
  now: Date,
): Promise<{ id: string; startsAt: Date } | null> {
  const { enrollment } = session;
  const time = enrollment.scheduleTime;

  if (!isValidTimeOfDay(time) || enrollment.scheduleDays.length === 0) {
    return null;
  }

  const deadline = cycleDeadlineDate(dateToCalendarDate(cycleStartDate));
  const today = todayInPlatformTz(now);

  if (compareDates(today, deadline) > 0) return null;

  const lengthMinutes =
    session.lengthMinutes ?? enrollment.sessionLengthMinutes ?? DEFAULT_SESSION_LENGTH_MINUTES;

  const context = await loadSlotContext(tx, {
    enrollmentId: session.enrollmentId,
    teacherId: session.teacherId,
    studentId: session.studentId,
    from: today,
    to: deadline,
  });

  const slot = findNextFreeSlot({
    now,
    earliest: today,
    deadline,
    scheduleDays: enrollment.scheduleDays,
    time,
    lengthMinutes,
    context,
  });

  if (!slot) return null;

  const highest = await tx.classSession.aggregate({
    where: { cycleId: session.cycleId },
    _max: { sessionNumber: true },
  });

  const id = crypto.randomUUID();

  const result = await tx.classSession.createMany({
    data: [
      {
        id,
        enrollmentId: session.enrollmentId,
        cycleId: session.cycleId,
        sessionNumber: (highest._max.sessionNumber ?? 0) + 1,
        teacherId: session.teacherId,
        studentId: session.studentId,
        parentId: session.parentId,
        scheduledDate: slotScheduledDate(slot),
        scheduledTime: time,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        lengthMinutes,
        makeupForSessionId: session.id,
      },
    ],
    skipDuplicates: true,
  });

  // A unique clash (another request took this date or session
  // number a moment ago): roll everything back and let the sweep retry.
  if (result.count === 0) {
    throw new FollowUpRetryLater();
  }

  return { id, startsAt: slot.startsAt };
}
