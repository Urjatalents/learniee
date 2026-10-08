import { recomputeEnrollmentCounters } from "@/features/shared/server/classSession.service";
import { closeCycleIfDue } from "@/features/shared/server/cycleClose.service";
import { prisma } from "@/lib/prisma";
import {
    ClassSessionStatus
} from "@prisma/client";
import "server-only";
import { applySessionFollowUp } from './apply';
import { COUNTED } from './base';

/** The single entry point every trigger calls after an outcome is written. */
export async function runSessionFollowUps(
  sessionId: string,
  now: Date = new Date(),
): Promise<void> {
  try {
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
      select: { id: true, status: true, cycleId: true, enrollmentId: true },
    });

    if (!session || !session.cycleId || session.status === ClassSessionStatus.SCHEDULED) {
      return;
    }

    // Counted outcomes other than COMPLETED (student no-show, late
    // cancel) feed the progress counters here; COMPLETED does it in
    // `sessionResolve.service.ts`.
    if (COUNTED.includes(session.status) && session.status !== ClassSessionStatus.COMPLETED) {
      await recomputeEnrollmentCounters(session.enrollmentId);
    }

    await applySessionFollowUp(session.id, now);
    await closeCycleIfDue(session.cycleId, now);
  } catch (err) {
    console.error(`Follow-up for session ${sessionId} failed:`, err);
  }
}
const REPAIR_MIN_AGE_MS = 2 * 60_000;
const REPAIR_BATCH_SIZE = 200;
/**
 * Sweep step: applies the follow-up for any final outcome whose
 * request died (or was rolled back) before applying it. Only touches
 * sessions that actually have a follow-up and are at least two
 * minutes old, so it never races the request that just wrote them.
 */
export async function repairPendingFollowUps(now: Date = new Date()): Promise<number> {
  const pending = await prisma.classSession.findMany({
    where: {
      cycleId: { not: null },
      followUpAppliedAt: null,
      updatedAt: { lte: new Date(now.getTime() - REPAIR_MIN_AGE_MS) },
      OR: [
        {
          status: {
            in: [ClassSessionStatus.TEACHER_NO_SHOW, ClassSessionStatus.STUDENT_NO_SHOW],
          },
        },
        {
          status: ClassSessionStatus.CANCELLED,
          cancelledByRole: { in: ["TEACHER", "SYSTEM"] },
        },
      ],
    },
    select: { id: true },
    orderBy: { updatedAt: "asc" },
    take: REPAIR_BATCH_SIZE,
  });

  for (const { id } of pending) {
    await runSessionFollowUps(id, now);
  }

  return pending.length;
}
