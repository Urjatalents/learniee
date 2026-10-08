import { logActivity } from "@/features/shared/server/activityLog.service";
import { recomputeEnrollmentCounters } from "@/features/shared/server/classSession.service";
import { lockCycle } from "@/features/shared/server/cycleSlots.service";
import { completeEnrollmentIfNoRenewal } from "@/features/shared/server/enrollmentCompletion.service";
import { decideCycleClose } from "@/features/shared/utils/cycleClose";
import type { SessionStatusValue } from "@/features/shared/utils/sessionOutcome";
import {
    dateToCalendarDate
} from "@/lib/platformTime";
import { prisma } from "@/lib/prisma";
import {
    CycleCloseReason,
    CycleStatus,
    EnrollmentStatus
} from "@prisma/client";
import "server-only";
import { releaseClosedCyclePayout } from './release';

/**
 * Cycle close (Part 1C §4 and §5, adjusted by Part 2B §1). A
 * cycle-model cycle CLOSES when every session is final (and any
 * no-show / teacher-cancel follow-up applied), or on day 45 at the
 * latest. Unfinished and uncounted sessions are forfeited: no
 * refund, no teacher pay.
 *
 * Closing writes, in ONE transaction, the cycle: `CLOSED`, when, why,
 * counted and forfeited totals (what Part 2A / `releaseClosedCyclePayout`
 * read). The transaction starts with a lock on the cycle row and a
 * conditional `OPEN -> CLOSED` update, so a cycle closes exactly once
 * however many triggers reach it, and no make-up can be added while
 * it is deciding.
 *
 * CLOSED is not the same as SETTLED: "final" (used to decide close)
 * only means every session's outcome and follow-up are done — it
 * says nothing about the parent's 48-hour confirmation window or an
 * open dispute. The payout ledger row is written separately, by
 * `releaseClosedCyclePayout()` below, only once the cycle is BOTH
 * closed AND every session in it has `settledAt` set — so an open
 * dispute holds the payout even after the cycle itself has closed.
 * Also decided here: whether the Enrollment is done (no renewal by
 * the time this cycle closed) — see `enrollmentCompletion.service.ts`.
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

      return {
        enrollmentId: cycle.enrollment.id,
        cycleNumber: cycle.cycleNumber,
        reason: decision.reason,
        countedSessions: decision.countedSessions,
        forfeitedSessions: decision.forfeitedSessions,
      };
    },
    { timeout: 15_000 },
  );

  if (!done) return { closed: false };

  // After commit — none of this can un-close the cycle. The counters
  // are derived, so a failure here is repaired by the next recompute.
  try {
    await recomputeEnrollmentCounters(done.enrollmentId);

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
      },
    });

    // Part 2B: does the Enrollment continue (a next cycle already
    // exists — renewed in time) or is it done? Independent of
    // whether the payout below can release yet.
    await completeEnrollmentIfNoRenewal(done.enrollmentId, done.cycleNumber, now);

    // Part 2B: release the payout now if this cycle is already fully
    // settled (nothing to wait on); otherwise this is a no-op and the
    // sweep / a later settlement event will release it.
    await releaseClosedCyclePayout(cycleId, now);
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
  };
}
