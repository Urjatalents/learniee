import { SESSION_POLICY } from "@/lib/platformConfig";
import {
    addDays,
    calendarDateToDate,
    todayInPlatformTz
} from "@/lib/platformTime";
import { prisma } from "@/lib/prisma";
import {
    ClassSessionStatus,
    CycleStatus,
    EnrollmentStatus
} from "@prisma/client";
import "server-only";
import { closeCycleIfDue } from './close';
import { releaseClosedCyclePayout } from './release';

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
