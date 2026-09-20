import "server-only";

import { prisma } from "@/lib/prisma";
import {
  ClassSessionStatus,
  CycleCloseReason,
  CycleStatus,
  EnrollmentStatus,
} from "@prisma/client";

import { SESSION_POLICY } from "@/lib/platformConfig";
import {
  addDays,
  calendarDateToDate,
  dateToCalendarDate,
  todayInPlatformTz,
} from "@/lib/platformTime";
import { decideCycleClose } from "@/features/shared/utils/cycleClose";
import type { SessionStatusValue } from "@/features/shared/utils/sessionOutcome";
import { lockCycle } from "@/features/shared/server/cycleSlots.service";
import { recomputeEnrollmentCounters } from "@/features/shared/server/classSession.service";
import { createLedgerEntryForClosedCycle } from "@/features/shared/server/tuitionLedger.service";
import { notifyCyclePayoutReady } from "@/features/shared/server/notificationTriggers.service";
import { logActivity } from "@/features/shared/server/activityLog.service";

/**
 * Cycle close (Part 1C §4 and §5). A cycle-model cycle closes when
 * every session is settled (final, and any no-show / teacher-cancel
 * follow-up applied), or on day 45 at the latest. Unfinished and
 * uncounted sessions are forfeited: no refund, no teacher pay.
 *
 * Closing writes, in ONE transaction:
 *   - the cycle: `CLOSED`, when, why, counted and forfeited totals
 *     (what Part 2A reads),
 *   - the one payout ledger row, based on COUNTED sessions (none if
 *     nothing counted — there is nothing to pay).
 * The transaction starts with a lock on the cycle row and a
 * conditional `OPEN -> CLOSED` update, so a cycle closes exactly
 * once however many triggers reach it, and no make-up can be added
 * while it is deciding.
 *
 * Triggers (no host-specific scheduler): after every follow-up, and
 * `closeDueCycles()` from the same sweep as resolve
 * (`/api/cron/resolve-sessions`). Legacy enrollments never come here.
 */

export interface CycleCloseResult {
  closed: boolean;
  reason?: CycleCloseReason;
  countedSessions?: number;
  forfeitedSessions?: number;
  ledgerCreated?: boolean;
}

export async function closeCycleIfDue(
  cycleId: string,
  now: Date = new Date(),
): Promise<CycleCloseResult> {
  // Cheap pre-check outside the lock: most calls end here.
  const peek = await prisma.enrollmentCycle.findUnique({
    where: { id: cycleId },
    select: { status: true, enrollment: { select: { isLegacy: true, status: true } } },
  });

  if (
    !peek ||
    peek.status !== CycleStatus.OPEN ||
    peek.enrollment.isLegacy ||
    peek.enrollment.status !== EnrollmentStatus.ACTIVE
  ) {
    return { closed: false };
  }

  const done = await prisma.$transaction(
    async (tx) => {
      await lockCycle(tx, cycleId);

      const cycle = await tx.enrollmentCycle.findUnique({
        where: { id: cycleId },
        include: {
          enrollment: {
            select: {
              id: true,
              parentId: true,
              teacherId: true,
              studentId: true,
              courseId: true,
              dueDate: true,
              isLegacy: true,
              status: true,
            },
          },
        },
      });

      if (
        !cycle ||
        cycle.status !== CycleStatus.OPEN ||
        cycle.enrollment.isLegacy ||
        cycle.enrollment.status !== EnrollmentStatus.ACTIVE
      ) {
        return null;
      }

      const sessions = await tx.classSession.findMany({
        where: { cycleId },
        select: { status: true, cancelledByRole: true, followUpAppliedAt: true, endsAt: true },
      });

      const decision = decideCycleClose({
        sessions: sessions.map((s) => ({ ...s, status: s.status as SessionStatusValue })),
        sessionCount: cycle.sessionCount,
        cycleStart: dateToCalendarDate(cycle.startDate),
        now,
      });

      if (!decision.close) return null;

      const claimed = await tx.enrollmentCycle.updateMany({
        where: { id: cycleId, status: CycleStatus.OPEN },
        data: {
          status: CycleStatus.CLOSED,
          closedAt: now,
          closeReason:
            decision.reason === "ALL_SESSIONS_FINAL"
              ? CycleCloseReason.ALL_SESSIONS_FINAL
              : CycleCloseReason.WINDOW_ENDED,
          countedSessionCount: decision.countedSessions,
          forfeitedSessionCount: decision.forfeitedSessions,
        },
      });

      if (claimed.count === 0) return null;

      const ledgerCreated = await createLedgerEntryForClosedCycle(tx, {
        enrollment: cycle.enrollment,
        cycle: {
          cycleNumber: cycle.cycleNumber,
          ratePerSession: cycle.ratePerSession,
          price: cycle.price,
        },
        countedSessions: decision.countedSessions,
      });

      return {
        enrollmentId: cycle.enrollment.id,
        cycleNumber: cycle.cycleNumber,
        reason: decision.reason,
        countedSessions: decision.countedSessions,
        forfeitedSessions: decision.forfeitedSessions,
        ledgerCreated,
      };
    },
    { timeout: 15_000 },
  );

  if (!done) return { closed: false };

  // After commit — none of this can un-close the cycle. The counters
  // are derived, so a failure here is repaired by the next recompute.
  try {
    await recomputeEnrollmentCounters(done.enrollmentId);

    if (done.ledgerCreated) {
      await notifyCyclePayoutReady(done.enrollmentId);
    }

    await logActivity({
      action: "CYCLE_CLOSED",
      actorRole: "SYSTEM",
      description: `Cycle ${done.cycleNumber} closed (${
        done.reason === "ALL_SESSIONS_FINAL" ? "all sessions final" : "45-day window ended"
      }): ${done.countedSessions} counted, ${done.forfeitedSessions} forfeited.`,
      metadata: {
        cycleId,
        enrollmentId: done.enrollmentId,
        reason: done.reason,
        countedSessions: done.countedSessions,
        forfeitedSessions: done.forfeitedSessions,
        ledgerCreated: done.ledgerCreated,
      },
    });
  } catch (err) {
    console.error(`Post-close steps for cycle ${cycleId} failed:`, err);
  }

  return {
    closed: true,
    reason:
      done.reason === "ALL_SESSIONS_FINAL"
        ? CycleCloseReason.ALL_SESSIONS_FINAL
        : CycleCloseReason.WINDOW_ENDED,
    countedSessions: done.countedSessions,
    forfeitedSessions: done.forfeitedSessions,
    ledgerCreated: done.ledgerCreated,
  };
}

const CLOSE_BATCH_SIZE = 200;

/**
 * Sweep step: closes every cycle that is due. Candidates are OPEN
 * cycles of active cycle-model enrollments that have sessions and
 * either started 45+ days ago (window over) or have no session left
 * SCHEDULED / NEEDS_REVIEW; `closeCycleIfDue` makes the final call.
 * Safe to run as often as the host's scheduler allows.
 */
export async function closeDueCycles(
  now: Date = new Date(),
): Promise<{ checked: number; closed: number; moreRemaining: boolean }> {
  const windowStartCutoff = calendarDateToDate(
    addDays(todayInPlatformTz(now), -SESSION_POLICY.completionWindowDays),
  );

  const candidates = await prisma.enrollmentCycle.findMany({
    where: {
      status: CycleStatus.OPEN,
      enrollment: { isLegacy: false, status: EnrollmentStatus.ACTIVE },
      sessions: { some: {} },
      OR: [
        { startDate: { lte: windowStartCutoff } },
        {
          sessions: {
            none: {
              status: { in: [ClassSessionStatus.SCHEDULED, ClassSessionStatus.NEEDS_REVIEW] },
            },
          },
        },
      ],
    },
    select: { id: true },
    orderBy: { startDate: "asc" },
    take: CLOSE_BATCH_SIZE,
  });

  let closed = 0;

  for (const { id } of candidates) {
    try {
      const result = await closeCycleIfDue(id, now);
      if (result.closed) closed += 1;
    } catch (err) {
      console.error(`Closing cycle ${id} failed:`, err);
    }
  }

  return {
    checked: candidates.length,
    closed,
    moreRemaining: candidates.length === CLOSE_BATCH_SIZE,
  };
}
