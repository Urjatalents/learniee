import { closeDueCycles, releaseDueCyclePayouts } from "@/features/shared/server/cycleClose.service";
import { reapplyApprovedLeaves } from "@/features/shared/server/leaveShift.service";
import {
    acceptExpiredConfirmations,
    acceptExpiredConfirmationsQuietly,
} from "@/features/shared/server/sessionConfirmation.service";
import {
    repairPendingFollowUps
} from "@/features/shared/server/sessionFollowUp.service";
import { SESSION_POLICY } from "@/lib/platformConfig";
import { prisma } from "@/lib/prisma";
import {
    ClassSessionStatus
} from "@prisma/client";
import "server-only";
import { applyCompletedSessionEffects } from './effects';
import { resolveSession } from './resolve';

/**
 * Read-time resolution: before any read that lists sessions for
 * these enrollments, resolve every cycle session whose scheduled end
 * has passed and that nothing has resolved yet. One indexed query
 * when there is nothing to do.
 */
export async function resolveEndedSessionsForEnrollments(
  enrollmentIds: string[],
  now: Date = new Date(),
): Promise<number> {
  if (enrollmentIds.length === 0) return 0;

  const due = await prisma.classSession.findMany({
    where: {
      enrollmentId: { in: enrollmentIds },
      status: ClassSessionStatus.SCHEDULED,
      cycleId: { not: null },
      endsAt: { lte: now },
    },
    select: { id: true },
    take: 200,
  });

  let changed = 0;

  for (const { id } of due) {
    try {
      const result = await resolveSession(id, now);
      if (result.changed) changed += 1;
    } catch (err) {
      // One bad row must not break the read that triggered this.
      console.error(`Read-time resolve failed for session ${id}:`, err);
    }
  }

  // Part 2A: anything already past the parent's 48 hours with no
  // action is accepted (the "read" trigger of the confirmation rule).
  await acceptExpiredConfirmationsQuietly(now, { enrollmentIds });

  return changed;
}
const SWEEP_BATCH_SIZE = 500;
/** Don't repair a just-resolved session — its own request is probably still applying it. */
const REPAIR_MIN_AGE_MS = 2 * 60_000;
export interface SessionSweepResult {
  resolved: number;
  repaired: number;
  /** Part 1C: follow-ups (make-up / strike / notices) applied late. */
  followUpsRepaired: number;
  /** Part 1C: sessions moved or cancelled because of approved teacher leave. */
  leaveSessionsShifted: number;
  /** Part 1C: cycles closed by this run. */
  cyclesClosed: number;
  /** Part 2A: sessions accepted because the parent's 48 hours passed with no action. */
  confirmationsAccepted: number;
  /** Part 2B: cycle payouts released (ledger row written) by this run. */
  payoutsReleased: number;
  /** True if a full batch was found — more work may remain for the next run. */
  moreRemaining: boolean;
}
/**
 * The backstop sweep: resolves any session still unresolved
 * `sweepDelayMinutes` (15) after its scheduled end, and re-applies
 * the counters for any COMPLETED session whose request died before
 * doing so. Idempotent — run it as often or as rarely as the host's
 * scheduler allows; correctness never depends on it (End and reads
 * resolve too), it only bounds how long a forgotten session can sit
 * unresolved.
 */
export async function runSessionSweep(now: Date = new Date()): Promise<SessionSweepResult> {
  const cutoff = new Date(now.getTime() - SESSION_POLICY.sweepDelayMinutes * 60_000);

  const due = await prisma.classSession.findMany({
    where: {
      status: ClassSessionStatus.SCHEDULED,
      cycleId: { not: null },
      endsAt: { lte: cutoff },
    },
    select: { id: true },
    orderBy: { endsAt: "asc" },
    take: SWEEP_BATCH_SIZE,
  });

  let resolved = 0;

  for (const { id } of due) {
    try {
      const result = await resolveSession(id, now);
      if (result.changed) resolved += 1;
    } catch (err) {
      console.error(`Sweep resolve failed for session ${id}:`, err);
    }
  }

  const unapplied = await prisma.classSession.findMany({
    where: {
      status: ClassSessionStatus.COMPLETED,
      cycleId: { not: null },
      resolvedAt: { not: null, lte: new Date(now.getTime() - REPAIR_MIN_AGE_MS) },
      countersAppliedAt: null,
    },
    select: { id: true },
    take: SWEEP_BATCH_SIZE,
  });

  let repaired = 0;

  for (const { id } of unapplied) {
    try {
      await applyCompletedSessionEffects(id);
      repaired += 1;
    } catch (err) {
      console.error(`Sweep repair failed for session ${id}:`, err);
    }
  }

  // Part 1C, in dependency order: finish any follow-up that didn't
  // apply, finish any leave shift, and only then close what is due —
  // a cycle waits for its follow-ups, so closing goes last. Each step
  // is idempotent and isolated: one failing must not stop the rest.
  let followUpsRepaired = 0;
  let leaveSessionsShifted = 0;
  let cyclesClosed = 0;
  let confirmationsAccepted = 0;
  let payoutsReleased = 0;
  let closeBacklog = false;
  let releaseBacklog = false;

  // Part 2A: settle every session whose 48 hours ran out. Independent
  // of the steps below (a cycle can close before it is settled).
  try {
    confirmationsAccepted = await acceptExpiredConfirmations(now);
  } catch (err) {
    console.error("Sweep confirmation accept failed:", err);
  }

  try {
    followUpsRepaired = await repairPendingFollowUps(now);
  } catch (err) {
    console.error("Sweep follow-up repair failed:", err);
  }

  try {
    leaveSessionsShifted = await reapplyApprovedLeaves(now);
  } catch (err) {
    console.error("Sweep leave re-apply failed:", err);
  }

  try {
    const closing = await closeDueCycles(now);
    cyclesClosed = closing.closed;
    closeBacklog = closing.moreRemaining;
  } catch (err) {
    console.error("Sweep cycle close failed:", err);
  }

  // Part 2B: backstop for any CLOSED cycle that became fully settled
  // with nothing watching (`closeCycleIfDue` / `confirmSessionOutcome`
  // / `applySessionDecision` already try to release immediately —
  // this only catches what they missed).
  try {
    const releasing = await releaseDueCyclePayouts(now);
    payoutsReleased = releasing.released;
    releaseBacklog = releasing.moreRemaining;
  } catch (err) {
    console.error("Sweep payout release failed:", err);
  }

  return {
    resolved,
    repaired,
    followUpsRepaired,
    leaveSessionsShifted,
    cyclesClosed,
    confirmationsAccepted,
    payoutsReleased,
    moreRemaining:
      due.length === SWEEP_BATCH_SIZE ||
      unapplied.length === SWEEP_BATCH_SIZE ||
      closeBacklog ||
      releaseBacklog,
  };
}
