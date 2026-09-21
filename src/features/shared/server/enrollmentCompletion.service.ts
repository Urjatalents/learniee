import "server-only";

import { prisma } from "@/lib/prisma";
import { EnrollmentStatus } from "@prisma/client";

import { notifyEnrollmentCompleted } from "@/features/shared/server/notificationTriggers.service";
import { logActivity } from "@/features/shared/server/activityLog.service";

/**
 * Money and Renewal, Part 2B (Sep 21, 2026) — end of enrollment.
 *
 * A cycle-model Enrollment has no recurring-billing job: it keeps
 * going only because the parent renews it (`renewal.service.ts`)
 * before or shortly after each cycle closes. `enrollmentAutoLapse.service.ts`
 * already excludes these rows (they have their own 45-day window and
 * cycle close) — this file is the rule that actually replaces
 * auto-lapse for them: no next cycle by the time this one closed ->
 * the Enrollment is done, not merely idle.
 *
 * Called from `cycleClose.service.ts` right after a cycle commits as
 * CLOSED. Never called for a cycle that still has a next cycle
 * (renewed in time) or for legacy enrollments.
 */
export async function completeEnrollmentIfNoRenewal(
  enrollmentId: string,
  closedCycleNumber: number,
  now: Date = new Date(),
): Promise<boolean> {
  const nextCycle = await prisma.enrollmentCycle.findUnique({
    where: {
      enrollmentId_cycleNumber: { enrollmentId, cycleNumber: closedCycleNumber + 1 },
    },
    select: { id: true },
  });

  // Renewed in time (or a request for it is already in flight and
  // won its race) — nothing to do.
  if (nextCycle) return false;

  // Conditional update: only an enrollment still ACTIVE at this exact
  // moment completes. A renewal payment that commits between the
  // check above and here loses the race gracefully — its own
  // `renewal.service.ts` write requires ACTIVE too, so at most one of
  // the two succeeds, never both.
  const updated = await prisma.enrollment.updateMany({
    where: { id: enrollmentId, status: EnrollmentStatus.ACTIVE, isLegacy: false },
    data: { status: EnrollmentStatus.COMPLETED },
  });

  if (updated.count === 0) return false;

  try {
    await notifyEnrollmentCompleted(enrollmentId);

    await logActivity({
      action: "ENROLLMENT_COMPLETED",
      actorRole: "SYSTEM",
      description: `Enrollment ${enrollmentId} completed — cycle ${closedCycleNumber} closed with no renewal.`,
      metadata: { enrollmentId, closedCycleNumber },
    });
  } catch (err) {
    console.error(`Post-completion steps for enrollment ${enrollmentId} failed:`, err);
  }

  return true;
}
