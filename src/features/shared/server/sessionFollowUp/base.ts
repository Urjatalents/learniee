import {
    COUNTED_SESSION_STATUSES,
    type SessionFollowUpPlan
} from "@/features/shared/utils/sessionOutcome";
import {
    Prisma
} from "@prisma/client";
import "server-only";

/**
 * Follow-ups after a cycle session reaches a final outcome (Part 1C):
 *
 *   teacher no-show   make-up + strike + Admin alert
 *   nobody joined     make-up
 *   teacher cancel    make-up + strike
 *   student no-show   notice to the parent
 *
 * Each follow-up happens ONCE. The whole database side (claim,
 * make-up, strike) runs in one transaction that starts by setting
 * `ClassSession.followUpAppliedAt` with a conditional update — the
 * request that wins that update does the work, every other request
 * (a repeat, a concurrent trigger, the sweep) finds it already set and
 * does nothing. Make-ups and strikes are also unique per session in
 * the database, so even a bug here could not create a second one.
 * Notifications go out after commit, from the winner only.
 *
 * A session with no make-up that fits inside the cycle's 45 days
 * simply stays uncounted; it is forfeited when the cycle closes.
 *
 * Triggered from the same three places as `resolveSession` (the End
 * tap / cancel, a read after the end time, the sweep) — the sweep
 * calls `repairPendingFollowUps` for anything a request left behind.
 * Never throws: the outcome is already saved.
 */

/** Rolls the transaction back so the sweep retries the whole follow-up later. */
export class FollowUpRetryLater extends Error {}
export const COUNTED = COUNTED_SESSION_STATUSES as readonly string[];
export interface AppliedFollowUp {
  plan: SessionFollowUpPlan;
  makeupStartsAt: Date | null;
  makeupWanted: boolean;
  strikeRecorded: boolean;
  makeupSessionId: string | null;
}
export type FollowUpSession = Prisma.ClassSessionGetPayload<{
  include: {
    enrollment: {
      select: {
        isLegacy: true;
        scheduleDays: true;
        scheduleTime: true;
        sessionLengthMinutes: true;
      };
    };
    cycle: { select: { id: true; startDate: true; status: true } };
  };
}>;
