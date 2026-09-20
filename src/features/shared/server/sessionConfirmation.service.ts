import "server-only";

import { prisma } from "@/lib/prisma";
import { ClassSessionStatus, OutcomeConfirmation } from "@prisma/client";

import { CONFIRMATION_WINDOW_MS } from "@/features/shared/utils/outcomeConfirmation";

/**
 * The database side of "settled or unsettled" (Part 2A).
 *
 * Once a cycle session's outcome is final the parent has 48 hours
 * (`SESSION_POLICY.disputeWindowHours`) to tap "All good" or "Report
 * a problem". No action means accepted — written here by
 * `acceptExpiredConfirmations`, the ONLY writer of `AUTO_ACCEPTED`.
 *
 * It is triggered from three independent places, so no scheduler or
 * host is load-bearing (same pattern as `resolveSession`):
 *   1. any read of that session's page (`sessionFlow.service.ts`),
 *   2. any calendar / session-list read for its enrollment
 *      (`resolveEndedSessionsForEnrollments`),
 *   3. the daily sweep (`runSessionSweep`).
 * It is one conditional bulk update, so repeating it is harmless.
 *
 * HAND-OVER TO PART 2B: a session is settled when
 * `ClassSession.settledAt` is not null. Call `countUnsettledSessions`
 * (it accepts anything already past its 48 hours first) — a cycle's
 * money can be released when it returns 0. Legacy sessions
 * (`cycleId = null`) never take part in any of this.
 */

/** Statuses the parent's window does not apply to. */
const NOT_FINAL_STATUSES: ClassSessionStatus[] = [
  ClassSessionStatus.SCHEDULED,
  ClassSessionStatus.NEEDS_REVIEW,
];

export interface AcceptScope {
  sessionId?: string;
  cycleId?: string;
  enrollmentIds?: string[];
}

/**
 * Accepts every final cycle session whose 48 hours have passed with
 * no parent action and no report. Returns how many it accepted.
 */
export async function acceptExpiredConfirmations(
  now: Date = new Date(),
  scope: AcceptScope = {},
): Promise<number> {
  const cutoff = new Date(now.getTime() - CONFIRMATION_WINDOW_MS);

  const result = await prisma.classSession.updateMany({
    where: {
      cycleId: scope.cycleId ?? { not: null },
      ...(scope.sessionId ? { id: scope.sessionId } : {}),
      ...(scope.enrollmentIds ? { enrollmentId: { in: scope.enrollmentIds } } : {}),
      settledAt: null,
      confirmation: null,
      status: { notIn: NOT_FINAL_STATUSES },
      // The window starts when the outcome became final: the resolve
      // time, or the cancel time for a cancellation.
      OR: [
        { resolvedAt: { lte: cutoff } },
        { resolvedAt: null, cancelledAt: { lte: cutoff } },
        { resolvedAt: null, cancelledAt: null, endsAt: { lte: cutoff } },
      ],
    },
    data: { confirmation: OutcomeConfirmation.AUTO_ACCEPTED, settledAt: now },
  });

  return result.count;
}

/** Same as the bulk accept, safe to call from a read path — never throws. */
export async function acceptExpiredConfirmationsQuietly(
  now: Date,
  scope: AcceptScope,
): Promise<number> {
  try {
    return await acceptExpiredConfirmations(now, scope);
  } catch (err) {
    console.error("Accepting expired confirmations failed:", err);

    return 0;
  }
}

/**
 * Part 2B's question: how many sessions of this cycle are still
 * unsettled (not final, window open, open report, or needs review)?
 * Zero means every session is settled.
 */
export async function countUnsettledSessions(
  cycleId: string,
  now: Date = new Date(),
): Promise<number> {
  await acceptExpiredConfirmations(now, { cycleId });

  return prisma.classSession.count({ where: { cycleId, settledAt: null } });
}
