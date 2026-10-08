import { logActivity } from "@/features/shared/server/activityLog.service";
import { recomputeEnrollmentCounters } from "@/features/shared/server/classSession.service";
import {
    notifyClassSessionCompleted,
    notifySessionNeedsReview,
} from "@/features/shared/server/notificationTriggers.service";
import {
    runSessionFollowUps
} from "@/features/shared/server/sessionFollowUp.service";
import { prisma } from "@/lib/prisma";
import {
    ClassSessionStatus
} from "@prisma/client";
import "server-only";

/**
 * Everything that follows a newly written outcome. Runs after the
 * outcome is committed and must not throw — the outcome is already
 * final, and a failure here is repaired by `runSessionSweep`
 * (`countersAppliedAt` stays null until the counters really ran).
 */
export async function afterOutcomeWritten(sessionId: string, status: string) {
  try {
    if (status === "COMPLETED") {
      await applyCompletedSessionEffects(sessionId);
    } else {
      await logActivity({
        action: "CLASS_SESSION_OUTCOME",
        actorRole: "SYSTEM",
        description: `Class session resolved as ${status.toLowerCase().replace(/_/g, " ")}.`,
        metadata: { sessionId, status },
      });
    }

    // Part 2A: Admin decides a session that ran for under half its time.
    if (status === "NEEDS_REVIEW") {
      await notifySessionNeedsReview(sessionId);
    }

    // Part 1C: counters for the other counted outcomes, the follow-up
    // (make-up, strike, Admin alert, parent notice) and the cycle
    // close check. Each is applied once and never throws.
    await runSessionFollowUps(sessionId);
  } catch (err) {
    console.error(`Session ${sessionId} follow-up after resolve failed:`, err);
  }
}
/**
 * Feeds a COMPLETED cycle session into the progress counters
 * (`recomputeEnrollmentCounters`, which since Part 1C counts per
 * cycle and no longer writes the ledger — cycle close does). It
 * derives everything from live session rows, so running it again is
 * harmless; `countersAppliedAt` just records that it ran so the
 * sweep only repairs sessions where it didn't.
 */
export async function applyCompletedSessionEffects(sessionId: string) {
  const session = await prisma.classSession.findUnique({
    where: { id: sessionId },
    select: { id: true, enrollmentId: true, status: true, countersAppliedAt: true },
  });

  if (
    !session ||
    session.status !== ClassSessionStatus.COMPLETED ||
    session.countersAppliedAt !== null
  ) {
    return;
  }

  await recomputeEnrollmentCounters(session.enrollmentId);

  const marked = await prisma.classSession.updateMany({
    where: { id: sessionId, countersAppliedAt: null },
    data: { countersAppliedAt: new Date() },
  });

  // Only the call that marked it notifies, so a repair never
  // double-notifies.
  if (marked.count > 0) {
    await notifyClassSessionCompleted(sessionId);

    await logActivity({
      action: "CLASS_SESSION_COMPLETED",
      actorRole: "SYSTEM",
      description: "Class session completed (both joined, overlap of at least 50%).",
      metadata: { sessionId, enrollmentId: session.enrollmentId },
    });
  }
}
