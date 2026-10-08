import {
    notifyCyclePayoutReady
} from "@/features/shared/server/notificationTriggers.service";
import { createLedgerEntryForCompletedCycle } from "@/features/shared/server/tuitionLedger.service";
import { COUNTED_SESSION_STATUSES } from "@/features/shared/utils/sessionOutcome";
import { prisma } from "@/lib/prisma";
import {
    ClassSessionStatus,
    CyclePayoutStatus,
    CycleStatus,
    Enrollment
} from "@prisma/client";
import "server-only";

const enrollmentWithRelationsInclude = {
  student: { select: { id: true, firstName: true, visibleName: true } },
  course: { select: { id: true, courseTitle: true } },
} as const;
/**
 * Recomputes `Enrollment.sessionsCompletedInCycle` /
 * `cyclesCompleted` / `cyclePayoutStatus` from the enrollment's
 * actual completed `ClassSession` count. Keeps the same "reset at
 * sessionsPerMonth" shape the project already had
 * (`cycleProgress.service.ts`'s original doc-comment) — this only
 * changes *what* drives the counter (a real completed
 * `ClassSession`, not a blind click), per the direct instruction
 * that logged that placeholder ("later we will set increment and
 * logic after connection with zoho api").
 *
 * Deriving from the all-time completed count (rather than trying to
 * track state incrementally) means this stays correct even if a
 * session gets marked complete out of date order — e.g. a Teacher
 * catching up on a missed click for an earlier date.
 *
 * Cycle completion also writes a real `TuitionLedgerEntry`
 * (tuitionLedger.service.ts), same as the counter-based
 * `cycleProgress.service.ts` did before this file replaced it —
 * this must stay wired or Accounts' payout-verification queue goes
 * silently dark. Both writes happen in one transaction so the
 * cycle-progress update and the ledger entry can't drift apart.
 * `cyclesCompleted` increasing versus the pre-update row is what
 * "a cycle just completed" means here (rather than re-checking
 * `sessionsCompletedInCycle === 0`), since deriving from the
 * all-time count can jump straight past a cycle boundary if a
 * Teacher marks several overdue sessions complete at once —
 * `createLedgerEntryForCompletedCycle` is still safe to call once
 * per resulting cycle number even so, via its own
 * unique-constraint/P2002 idempotency guard.
 */
export async function recomputeEnrollmentCounters(enrollmentId: string) {
  const before = await prisma.enrollment.findUniqueOrThrow({
    where: { id: enrollmentId },
  });

  // Cycle model (Part 1C): progress is the number of COUNTED sessions
  // in the cycle, and the payout ledger row is written when the cycle
  // closes (`cycleClose.service.ts`), not when a session completes.
  if (!before.isLegacy) {
    return recomputeCycleModelCounters(before);
  }

  const totalCompleted = await prisma.classSession.count({
    where: { enrollmentId, status: ClassSessionStatus.COMPLETED },
  });

  const perCycle = Math.max(1, before.sessionsPerMonth);
  const cyclesCompleted = Math.floor(totalCompleted / perCycle);
  const sessionsCompletedInCycle = totalCompleted % perCycle;
  const cyclePayoutStatus =
    sessionsCompletedInCycle === 0 && totalCompleted > 0
      ? CyclePayoutStatus.READY_FOR_PAYOUT
      : CyclePayoutStatus.IN_PROGRESS;

  const lastCompleted = await prisma.classSession.findFirst({
    where: { enrollmentId, status: ClassSessionStatus.COMPLETED },
    orderBy: { completedAt: "desc" },
    select: { completedAt: true },
  });

  const cycleJustCompleted = cyclesCompleted > before.cyclesCompleted;

  const updateData = {
    sessionsCompletedInCycle,
    cyclesCompleted,
    cyclePayoutStatus,
    lastSessionMarkedAt: lastCompleted?.completedAt ?? before.lastSessionMarkedAt,
    lastClassAt: lastCompleted?.completedAt ?? before.lastClassAt,
  };

  if (!cycleJustCompleted) {
    return prisma.enrollment.update({
      where: { id: enrollmentId },
      data: updateData,
      include: enrollmentWithRelationsInclude,
    });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updated = await tx.enrollment.update({
      where: { id: enrollmentId },
      data: updateData,
      include: enrollmentWithRelationsInclude,
    });

    await createLedgerEntryForCompletedCycle(tx, updated);

    return updated;
  });

  await notifyCyclePayoutReady(enrollmentId);

  return updated;
}
/**
 * Cycle-model counters (Part 1C). Replaces "all completed sessions
 * divided by sessions per month" with per-cycle counts of COUNTED
 * sessions (completed, student no-show, late parent cancel — see
 * `sessionOutcomeCounts`):
 *
 *   sessionsCompletedInCycle  counted sessions in the cycle that is
 *                             open now (or in the latest cycle when
 *                             every cycle is closed), never above
 *                             that cycle's paid session count
 *   cyclesCompleted           cycles that have CLOSED
 *   cyclePayoutStatus         READY_FOR_PAYOUT once the latest cycle
 *                             closed with something to pay, else
 *                             IN_PROGRESS
 *
 * Derived from live `ClassSession` rows every time, so it is safe to
 * repeat and self-heals. It never writes the ledger — closing the
 * cycle does. The return shape matches the legacy branch, so
 * callers and progress screens are unaffected.
 */
async function recomputeCycleModelCounters(before: Enrollment) {
  const cycles = await prisma.enrollmentCycle.findMany({
    where: { enrollmentId: before.id },
    orderBy: { cycleNumber: "asc" },
    select: {
      id: true,
      status: true,
      sessionCount: true,
      countedSessionCount: true,
    },
  });

  const openCycle = [...cycles].reverse().find((c) => c.status === CycleStatus.OPEN);
  const shownCycle = openCycle ?? cycles[cycles.length - 1] ?? null;
  const cyclesCompleted = cycles.filter((c) => c.status === CycleStatus.CLOSED).length;

  let sessionsCompletedInCycle = 0;

  if (shownCycle) {
    if (shownCycle.status === CycleStatus.CLOSED && shownCycle.countedSessionCount !== null) {
      sessionsCompletedInCycle = shownCycle.countedSessionCount;
    } else {
      const counted = await prisma.classSession.count({
        where: {
          cycleId: shownCycle.id,
          status: { in: [...COUNTED_SESSION_STATUSES] as ClassSessionStatus[] },
        },
      });

      sessionsCompletedInCycle = Math.min(counted, shownCycle.sessionCount);
    }
  }

  const latest = cycles[cycles.length - 1] ?? null;
  const readyForPayout =
    !openCycle &&
    latest !== null &&
    latest.status === CycleStatus.CLOSED &&
    (latest.countedSessionCount ?? 0) > 0;

  const lastCompleted = await prisma.classSession.findFirst({
    where: { enrollmentId: before.id, status: ClassSessionStatus.COMPLETED },
    orderBy: { completedAt: "desc" },
    select: { completedAt: true },
  });

  return prisma.enrollment.update({
    where: { id: before.id },
    data: {
      sessionsCompletedInCycle,
      cyclesCompleted,
      cyclePayoutStatus: readyForPayout
        ? CyclePayoutStatus.READY_FOR_PAYOUT
        : CyclePayoutStatus.IN_PROGRESS,
      lastSessionMarkedAt: lastCompleted?.completedAt ?? before.lastSessionMarkedAt,
      lastClassAt: lastCompleted?.completedAt ?? before.lastClassAt,
    },
    include: enrollmentWithRelationsInclude,
  });
}
