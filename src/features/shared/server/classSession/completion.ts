import {
    notifyClassSessionCompleted
} from "@/features/shared/server/notificationTriggers.service";
import { prisma } from "@/lib/prisma";
import {
    ClassSessionStatus,
    EnrollmentStatus
} from "@prisma/client";
import "server-only";
import { ClassSessionError, startOfDay } from './core';
import { recomputeEnrollmentCounters } from './counters';
import { ensureSessionsGenerated } from './generation';

/**
 * Marks a specific session complete — Teacher-only, must own it and
 * it must still be SCHEDULED. Recomputes the Enrollment's cycle
 * counters from the resulting set of completed sessions.
 */
export async function markClassSessionComplete(
  sessionId: string,
  teacherId: string,
) {
  const session = await prisma.classSession.findFirst({
    where: { id: sessionId, teacherId },
  });

  if (!session) {
    throw new ClassSessionError(
      "Session not found, or doesn't belong to you.",
      404,
    );
  }

  // Cycle-model sessions (Part 1B) are never marked by hand — their
  // outcome comes from the recorded Start / Join / End events
  // (`sessionResolve.service.ts`). Legacy sessions keep this path.
  if (session.cycleId) {
    throw new ClassSessionError(
      "This session can't be marked complete by hand — it is completed from the Start, Join and End events.",
      409,
    );
  }

  if (session.status !== ClassSessionStatus.SCHEDULED) {
    throw new ClassSessionError(
      `This session is already marked ${session.status.toLowerCase()}.`,
      409,
    );
  }

  await prisma.classSession.update({
    where: { id: sessionId },
    data: {
      status: ClassSessionStatus.COMPLETED,
      completedAt: new Date(),
      completedByRole: "TEACHER",
    },
  });

  const result = await recomputeEnrollmentCounters(session.enrollmentId);
  await notifyClassSessionCompleted(sessionId);

  return result;
}
/**
 * Backward-compatible one-click path — the original "Mark session
 * complete" button. Finds the earliest still-SCHEDULED session that
 * is already due (`scheduledDate` <= today) and marks *that one*
 * complete, instead of blindly incrementing a counter with no date
 * behind it. Used by `PATCH
 * /api/teacher/enrollments/[id]/mark-session` so the existing
 * one-click UI keeps working unchanged; `PATCH
 * /api/teacher/class-sessions/[id]/complete` is the explicit,
 * pick-a-specific-date path the new sessions list uses.
 */
export async function markNextDueSessionComplete(
  enrollmentId: string,
  teacherId: string,
) {
  const enrollment = await ensureSessionsGenerated(enrollmentId);

  if (!enrollment || enrollment.teacherId !== teacherId) {
    throw new ClassSessionError(
      "Enrollment not found, or doesn't belong to you.",
      404,
    );
  }

  if (enrollment.status !== EnrollmentStatus.ACTIVE) {
    throw new ClassSessionError(
      "Sessions can only be marked complete for an active enrollment.",
    );
  }

  if (!enrollment.isLegacy) {
    throw new ClassSessionError(
      "Sessions of this enrollment are completed from the Start, Join and End events — they can't be marked complete by hand.",
      409,
    );
  }

  const endOfToday = startOfDay(new Date());
  endOfToday.setDate(endOfToday.getDate() + 1);

  const next = await prisma.classSession.findFirst({
    where: {
      enrollmentId,
      teacherId,
      status: ClassSessionStatus.SCHEDULED,
      scheduledDate: { lt: endOfToday },
    },
    orderBy: { scheduledDate: "asc" },
  });

  if (!next) {
    throw new ClassSessionError(
      "No scheduled class is due to be marked complete yet — check the schedule, or mark a specific date from the sessions list.",
      409,
    );
  }

  return markClassSessionComplete(next.id, teacherId);
}
