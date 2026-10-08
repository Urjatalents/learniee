import { logActivity } from "@/features/shared/server/activityLog.service";
import { lockCycle } from "@/features/shared/server/cycleSlots.service";
import { notifyCyclePayoutReady } from "@/features/shared/server/notificationTriggers.service";
import { acceptExpiredConfirmationsQuietly } from "@/features/shared/server/sessionConfirmation.service";
import { createLedgerEntryForClosedCycle } from "@/features/shared/server/tuitionLedger.service";
import { prisma } from "@/lib/prisma";
import {
    CycleStatus
} from "@prisma/client";
import "server-only";

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
