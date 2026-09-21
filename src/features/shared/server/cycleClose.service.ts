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
import { acceptExpiredConfirmationsQuietly } from "@/features/shared/server/sessionConfirmation.service";
import { completeEnrollmentIfNoRenewal } from "@/features/shared/server/enrollmentCompletion.service";
import { notifyCyclePayoutReady } from "@/features/shared/server/notificationTriggers.service";
import { logActivity } from "@/features/shared/server/activityLog.service";

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

/**
 * Part 2B §1: releases a CLOSED cycle's payout — creates its one
 * ledger row (`createLedgerEntryForClosedCycle`, based on the counted
 * total recorded at close) — but ONLY once every session in it is
 * settled (`ClassSession.settledAt` all non-null): the parent's
 * 48-hour window has passed on all of them with no report, or every
 * report/`NEEDS_REVIEW` has an Admin decision. An open dispute (or an
 * open confirmation window) simply holds the release — this function
 * is safe and cheap to call again later, and is the only writer of
 * `EnrollmentCycle.payoutReleasedAt`.
 *
 * Settles anything whose 48 hours already ran out first (same order
 * the sweep already uses: confirmations before close/release), then
 * takes the same cycle lock every other cycle writer takes.
 */
export async function releaseClosedCyclePayout(
  cycleId: string,
  now: Date = new Date(),
): Promise<{ released: boolean; ledgerCreated?: boolean }> {
  await acceptExpiredConfirmationsQuietly(now, { cycleId });

  const peek = await prisma.enrollmentCycle.findUnique({
    where: { id: cycleId },
    select: { status: true, payoutReleasedAt: true, enrollment: { select: { isLegacy: true } } },
  });

  if (
    !peek ||
    peek.status !== CycleStatus.CLOSED ||
    peek.payoutReleasedAt ||
    peek.enrollment.isLegacy
  ) {
    return { released: false };
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
            },
          },
        },
      });

      if (
        !cycle ||
        cycle.status !== CycleStatus.CLOSED ||
        cycle.payoutReleasedAt ||
        cycle.enrollment.isLegacy
      ) {
        return null;
      }

      // The gate: an open report/confirmation window on ANY session
      // in this cycle holds the whole cycle's payout.
      const unsettled = await tx.classSession.count({
        where: { cycleId, settledAt: null },
      });

      if (unsettled > 0) return null;

      const ledgerCreated = await createLedgerEntryForClosedCycle(tx, {
        enrollment: cycle.enrollment,
        cycle: {
          cycleNumber: cycle.cycleNumber,
          ratePerSession: cycle.ratePerSession,
          price: cycle.price,
        },
        countedSessions: cycle.countedSessionCount ?? 0,
      });

      await tx.enrollmentCycle.update({
        where: { id: cycleId },
        data: { payoutReleasedAt: now },
      });

      return {
        enrollmentId: cycle.enrollment.id,
        cycleNumber: cycle.cycleNumber,
        ledgerCreated,
      };
    },
    { timeout: 15_000 },
  );

  if (!done) return { released: false };

  try {
    if (done.ledgerCreated) {
      await notifyCyclePayoutReady(done.enrollmentId);
    }

    await logActivity({
      action: "CYCLE_PAYOUT_RELEASED",
      actorRole: "SYSTEM",
      description: `Cycle ${done.cycleNumber} settled — payout ${
        done.ledgerCreated ? "queued for Accounts' review" : "skipped (nothing counted)"
      }.`,
      metadata: { cycleId, enrollmentId: done.enrollmentId, ledgerCreated: done.ledgerCreated },
    });
  } catch (err) {
    console.error(`Post-release steps for cycle ${cycleId} failed:`, err);
  }

  return { released: true, ledgerCreated: done.ledgerCreated };
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

const RELEASE_BATCH_SIZE = 200;

/**
 * Part 2B sweep step: releases the payout for every CLOSED cycle
 * that is now fully settled but hasn't had its ledger row created
 * yet. The backstop for the case a settlement event fired with
 * nothing watching (a report's 48h ran out with no one reading that
 * session's page) — `confirmSessionOutcome` / `applySessionDecision`
 * already call `releaseClosedCyclePayout` immediately when they are
 * the settlement that clears the last unsettled session, so this
 * sweep is a same-day backstop rather than the only path.
 */
export async function releaseDueCyclePayouts(
  now: Date = new Date(),
): Promise<{ checked: number; released: number; moreRemaining: boolean }> {
  const candidates = await prisma.enrollmentCycle.findMany({
    where: {
      status: CycleStatus.CLOSED,
      payoutReleasedAt: null,
      enrollment: { isLegacy: false },
      sessions: { none: { settledAt: null } },
    },
    select: { id: true },
    orderBy: { closedAt: "asc" },
    take: RELEASE_BATCH_SIZE,
  });

  let released = 0;

  for (const { id } of candidates) {
    try {
      const result = await releaseClosedCyclePayout(id, now);
      if (result.released) released += 1;
    } catch (err) {
      console.error(`Releasing payout for cycle ${id} failed:`, err);
    }
  }

  return {
    checked: candidates.length,
    released,
    moreRemaining: candidates.length === RELEASE_BATCH_SIZE,
  };
}
