import { lockCycle } from "@/features/shared/server/cycleSlots.service";
import { reconcileLedgerEntryForClosedCycle } from "@/features/shared/server/tuitionLedger.service";
import {
    sessionOutcomeCounts,
    type SessionStatusValue
} from "@/features/shared/utils/sessionOutcome";
import { prisma } from "@/lib/prisma";
import {
    CycleStatus
} from "@prisma/client";
import "server-only";

/**
 * A decision changed how many sessions of an already-CLOSED cycle
 * count: brings the cycle's counted / forfeited totals in line, and —
 * ONLY if this cycle's payout already released (Part 2B) — corrects
 * its existing ledger row too (see `reconcileLedgerEntryForClosedCycle`
 * for exactly what is and isn't touched). If the payout hasn't
 * released yet, the corrected total is left for `releaseClosedCyclePayout()`
 * (called right after this by the caller) to read once the cycle is
 * fully settled — writing a ledger row here would skip that gate.
 * Returns warnings.
 */
export async function reconcileClosedCycle(cycleId: string): Promise<string[]> {
  return prisma.$transaction(
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

      if (!cycle || cycle.status !== CycleStatus.CLOSED || cycle.enrollment.isLegacy) {
        return [];
      }

      const sessions = await tx.classSession.findMany({
        where: { cycleId },
        select: { status: true },
      });

      const counted = Math.min(
        sessions.filter((s) => sessionOutcomeCounts(s.status as SessionStatusValue) === true)
          .length,
        cycle.sessionCount,
      );

      if (counted !== (cycle.countedSessionCount ?? 0)) {
        await tx.enrollmentCycle.update({
          where: { id: cycleId },
          data: {
            countedSessionCount: counted,
            forfeitedSessionCount: Math.max(0, cycle.sessionCount - counted),
          },
        });
      }

      // Payout not released yet — nothing more to do here; the
      // caller's follow-up `releaseClosedCyclePayout()` call will
      // pick up this corrected total once the cycle is fully settled.
      if (!cycle.payoutReleasedAt) return [];

      const ledger = await reconcileLedgerEntryForClosedCycle(tx, {
        enrollment: cycle.enrollment,
        cycle: {
          cycleNumber: cycle.cycleNumber,
          ratePerSession: cycle.ratePerSession,
          price: cycle.price,
        },
        countedSessions: counted,
      });

      const warnings: string[] = [];

      if (ledger === "LOCKED") {
        warnings.push(
          `Cycle ${cycle.cycleNumber} had already closed and its payout has moved past Verification, so the ledger amount was NOT changed. It now counts ${counted} session${counted === 1 ? "" : "s"} — adjust the payout by hand.`,
        );
      }

      return warnings;
    },
    { timeout: 15_000 },
  );
}
