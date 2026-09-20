import "server-only";

import { prisma } from "@/lib/prisma";
import { EnrollmentStatus } from "@prisma/client";

import { notifyEnrollmentLapsed } from "@/features/shared/server/notificationTriggers.service";
import { logActivity } from "@/features/shared/server/activityLog.service";

/**
 * Enrollment auto-lapse (resolves 06-OPEN-DECISIONS.md #27 /
 * 04-BUILD-PLAN-TIMELINE.md Week 3's carried-over gap): a
 * `LAPSED` status value and `Enrollment.lastClassAt` field have
 * existed since Sep 1, 2026, but nothing ever actually flipped a
 * stale enrollment to `LAPSED` — this file is that missing piece,
 * now that `ClassSession` (built Sep 4) gives it something real to
 * check against.
 *
 * Part 1C: applies to LEGACY enrollments only (`isLegacy = true`).
 *
 * Rule: an `ACTIVE` enrollment with no class *conducted* (a real
 * `ClassSession` marked `COMPLETED`, not merely scheduled) in the
 * last `LAPSE_THRESHOLD_DAYS` days lapses automatically.
 *
 * Reference date per enrollment, in priority order:
 *   1. `lastClassAt` — set every time a session is marked complete
 *      (`classSession.service.ts`), the most accurate signal.
 *   2. `adminApprovedAt` — when the enrollment actually became
 *      `ACTIVE` (dual-approval's last step), used when no class has
 *      ever been completed yet.
 *   3. `cycleStartDate` — falls back further only if `adminApprovedAt`
 *      is somehow missing on an already-`ACTIVE` row.
 *
 * `LAPSED` is intentionally NOT a terminal/deleted state — it stays
 * in `GENERATION_STATUSES`/`CALENDAR_STATUSES`
 * (`classSession.service.ts` / `scheduleOccurrences.service.ts`), so
 * existing history, Chat, and Homework remain visible. Re-activating
 * a `LAPSED` enrollment back to `ACTIVE` is not built yet — flagged
 * as the natural next question in 06-OPEN-DECISIONS.md #34, not
 * something this file decides on its own.
 */

export const LAPSE_THRESHOLD_DAYS = 45;
const LAPSE_THRESHOLD_MS = LAPSE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;

function referenceDateFor(enrollment: {
  lastClassAt: Date | null;
  adminApprovedAt: Date | null;
  cycleStartDate: Date;
}): Date {
  return enrollment.lastClassAt ?? enrollment.adminApprovedAt ?? enrollment.cycleStartDate;
}

export interface AutoLapseResult {
  checked: number;
  lapsed: number;
  lapsedEnrollmentIds: string[];
}

/**
 * Scans every `ACTIVE` enrollment and lapses the ones past the
 * threshold. Safe to call repeatedly (idempotent — already-`LAPSED`
 * rows are excluded from the `where` clause, so re-running never
 * double-notifies) and safe to call from a cron or manually. Each
 * row is handled independently so one bad row can't block the rest.
 */
export async function runEnrollmentAutoLapse(now: Date = new Date()): Promise<AutoLapseResult> {
  const candidates = await prisma.enrollment.findMany({
    // Legacy enrollments only (Part 1C): cycle-model enrollments have
    // their own 45-day window and cycle close, and the old rule would
    // lapse them wrongly. Part 2A replaces this rule for them.
    where: { status: EnrollmentStatus.ACTIVE, isLegacy: true },
    select: {
      id: true,
      lastClassAt: true,
      adminApprovedAt: true,
      cycleStartDate: true,
    },
  });

  const lapsedEnrollmentIds: string[] = [];

  for (const enrollment of candidates) {
    try {
      const referenceDate = referenceDateFor(enrollment);
      const idleMs = now.getTime() - referenceDate.getTime();

      if (idleMs < LAPSE_THRESHOLD_MS) {
        continue;
      }

      // Re-check status inside the update itself so two overlapping
      // runs (e.g. a manual trigger during a scheduled one) can't
      // both "win" and double-fire notifications for the same row.
      const updated = await prisma.enrollment.updateMany({
        where: { id: enrollment.id, status: EnrollmentStatus.ACTIVE },
        data: { status: EnrollmentStatus.LAPSED },
      });

      if (updated.count === 0) {
        continue;
      }

      lapsedEnrollmentIds.push(enrollment.id);

      await notifyEnrollmentLapsed(enrollment.id);

      await logActivity({
        action: "ENROLLMENT_AUTO_LAPSED",
        actorRole: "SYSTEM",
        description: `Enrollment ${enrollment.id} auto-lapsed after ${LAPSE_THRESHOLD_DAYS} days with no class conducted.`,
        metadata: {
          enrollmentId: enrollment.id,
          referenceDate: referenceDate.toISOString(),
          idleDays: Math.floor(idleMs / (24 * 60 * 60 * 1000)),
        },
      });
    } catch (err) {
      // One enrollment's failure must never stop the sweep from
      // checking the rest — same reasoning as notifyX()'s safe()
      // wrapper elsewhere in the Notification triggers.
      console.error(`Enrollment auto-lapse failed for ${enrollment.id}:`, err);
    }
  }

  return {
    checked: candidates.length,
    lapsed: lapsedEnrollmentIds.length,
    lapsedEnrollmentIds,
  };
}
