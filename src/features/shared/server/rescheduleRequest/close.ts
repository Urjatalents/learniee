import { notifyRescheduleClosed } from "@/features/shared/server/notificationTriggers.service";
import { calendarDateToDate, todayInPlatformTz } from "@/lib/platformTime";
import { prisma } from "@/lib/prisma";
import { ClassSessionStatus, Prisma, RescheduleRequestStatus } from "@prisma/client";
import "server-only";
import { PENDING_STATUSES } from "./base";

/**
 * Phase 1.2 / 1.3: system-side closing of reschedule requests that
 * can no longer be answered. Both reasons end in CANCELLED (no new
 * status, so no migration) with a `responseNote` saying why, and
 * both parties are told.
 *
 * Idempotent: each row is closed with a guarded update (only while it
 * is still pending), and only the update that actually changed the
 * row sends the notification. Safe to call from many triggers at once
 * (reads, approvals, the sweep).
 */
export type RescheduleCloseReason = "EXPIRED" | "TEACHER_LEAVE";

const CLOSE_NOTES: Record<RescheduleCloseReason, string> = {
  EXPIRED: "Expired: no response before the class start time. The original slot stands.",
  TEACHER_LEAVE: "Closed: the teacher's approved leave affects this class.",
};

const CLOSE_BATCH_SIZE = 200;

export async function closePendingRescheduleRequests(
  where: Prisma.RescheduleRequestWhereInput,
  reason: RescheduleCloseReason,
  now: Date = new Date(),
): Promise<number> {
  const rows = await prisma.rescheduleRequest.findMany({
    where: { AND: [{ status: { in: PENDING_STATUSES } }, where] },
    select: { id: true },
    take: CLOSE_BATCH_SIZE,
  });

  let closed = 0;

  for (const { id } of rows) {
    const result = await prisma.rescheduleRequest.updateMany({
      where: { id, status: { in: PENDING_STATUSES } },
      data: {
        status: RescheduleRequestStatus.CANCELLED,
        responseNote: CLOSE_NOTES[reason],
        respondedAt: now,
      },
    });

    if (result.count === 1) {
      closed += 1;
      await notifyRescheduleClosed(id, reason);
    }
  }

  return closed;
}

/**
 * Phase 1.3: closes every pending request whose class has already
 * started (or is no longer scheduled), keeping the original slot.
 * `scope` narrows the search for read-time calls (one teacher, one
 * parent, one request); the sweep passes nothing.
 */
export function expireStaleRescheduleRequests(
  now: Date = new Date(),
  scope: Prisma.RescheduleRequestWhereInput = {},
): Promise<number> {
  return closePendingRescheduleRequests(
    {
      AND: [
        scope,
        {
          classSession: {
            OR: [
              { startsAt: { lte: now } },
              // Legacy sessions have no start instant: stale once their date has passed.
              {
                startsAt: null,
                scheduledDate: { lt: calendarDateToDate(todayInPlatformTz(now)) },
              },
              { status: { not: ClassSessionStatus.SCHEDULED } },
            ],
          },
        },
      ],
    },
    "EXPIRED",
    now,
  );
}

/** Read-time wrapper: never lets an expiry failure break the read that triggered it. */
export async function expireStaleRescheduleRequestsQuietly(
  scope: Prisma.RescheduleRequestWhereInput,
  now: Date = new Date(),
) {
  try {
    await expireStaleRescheduleRequests(now, scope);
  } catch (err) {
    console.error("Reschedule expiry failed:", err);
  }
}
