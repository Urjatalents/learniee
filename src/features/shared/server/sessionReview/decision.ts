import { logActivity } from "@/features/shared/server/activityLog.service";
import { recomputeEnrollmentCounters } from "@/features/shared/server/classSession.service";
import { releaseClosedCyclePayout } from "@/features/shared/server/cycleClose.service";
import { lockCycle } from "@/features/shared/server/cycleSlots.service";
import { notifySessionOutcomeDecided } from "@/features/shared/server/notificationTriggers.service";
import { runSessionFollowUps } from "@/features/shared/server/sessionFollowUp.service";
import type {
    SessionReviewDecisionResult
} from "@/features/shared/types/sessionReview";
import {
    ADMIN_DECISION_OPTIONS,
    adminReviewKind,
    DECISION_REASON_MAX_LENGTH,
    DECISION_REASON_MIN_LENGTH,
    isAdminDecisionStatus,
} from "@/features/shared/utils/outcomeConfirmation";
import {
    planSessionFollowUp,
    SESSION_STATUS_LABEL,
    type SessionStatusValue
} from "@/features/shared/utils/sessionOutcome";
import { prisma } from "@/lib/prisma";
import {
    ClassSessionStatus,
    CycleStatus,
    OutcomeConfirmation,
    OutcomeDecisionKind,
    RescheduleRequestStatus,
    type Prisma,
} from "@prisma/client";
import "server-only";
import { CANCEL_STATUSES, PENDING_RESCHEDULE, SessionDecisionInput, SessionReviewError } from './base';
import { reconcileClosedCycle } from './reconcile';

/**
 * Takes back the follow-up of the outcome being replaced: the strike
 * goes, and a make-up that has not started yet is cancelled and
 * detached (so the session can get a fresh one if the new outcome
 * needs it). A make-up that already started or finished is left in
 * place — the cycle's counted total never exceeds what was paid for.
 * Returns true if such a make-up was left.
 */
async function undoFollowUp(
  tx: Prisma.TransactionClient,
  session: { id: string },
  now: Date,
): Promise<boolean> {
  await tx.teacherStrike.deleteMany({ where: { classSessionId: session.id } });

  const makeup = await tx.classSession.findUnique({
    where: { makeupForSessionId: session.id },
    select: { id: true, status: true, teacherStartedAt: true, studentJoinedAt: true },
  });

  if (!makeup) return false;

  const untouched =
    makeup.status === ClassSessionStatus.SCHEDULED &&
    makeup.teacherStartedAt === null &&
    makeup.studentJoinedAt === null;

  if (!untouched) return true;

  await tx.classSession.update({
    where: { id: makeup.id },
    data: {
      status: ClassSessionStatus.CANCELLED,
      cancelledAt: now,
      cancelledByRole: "ADMIN",
      cancelReason: "Cancelled because Admin changed the outcome of the class it replaced.",
      makeupForSessionId: null,
      // Admin's own action: nothing for the parent to confirm.
      confirmation: OutcomeConfirmation.ADMIN_DECIDED,
      settledAt: now,
    },
  });

  await tx.rescheduleRequest.updateMany({
    where: { classSessionId: makeup.id, status: { in: PENDING_RESCHEDULE } },
    data: { status: RescheduleRequestStatus.CANCELLED, respondedAt: now },
  });

  return false;
}
/**
 * Decides (or overrides) a session outcome. Returns warnings Admin
 * should read — never throws for the follow-up work after the
 * decision is saved (the sweep repairs it).
 */
export async function applySessionDecision(
  input: SessionDecisionInput,
  now: Date = new Date(),
): Promise<SessionReviewDecisionResult> {
  const reason = input.reason.replace(/\r\n/g, "\n").trim();

  if (reason.length < DECISION_REASON_MIN_LENGTH) {
    throw new SessionReviewError("A reason is required for every decision.", 400);
  }

  if (reason.length > DECISION_REASON_MAX_LENGTH) {
    throw new SessionReviewError(
      `Keep the reason under ${DECISION_REASON_MAX_LENGTH} characters.`,
      400,
    );
  }

  if (!isAdminDecisionStatus(input.toStatus)) {
    throw new SessionReviewError(
      `Outcome must be one of: ${ADMIN_DECISION_OPTIONS.map((o) => o.status).join(", ")}.`,
      400,
    );
  }

  const toStatus: ClassSessionStatus = input.toStatus;

  const peek = await prisma.classSession.findUnique({
    where: { id: input.sessionId },
    select: { cycleId: true },
  });

  if (!peek?.cycleId) {
    throw new SessionReviewError("Class session not found.", 404);
  }

  const cycleId = peek.cycleId;

  const done = await prisma.$transaction(
    async (tx) => {
      // Serialise with every other writer of this cycle (follow-ups,
      // make-ups, cycle close).
      await lockCycle(tx, cycleId);

      const session = await tx.classSession.findUnique({
        where: { id: input.sessionId },
        include: {
          cycle: { select: { status: true } },
          enrollment: { select: { isLegacy: true } },
        },
      });

      if (!session || !session.cycle || session.enrollment.isLegacy) {
        throw new SessionReviewError("Class session not found.", 404);
      }

      if (session.status !== input.expectedStatus) {
        throw new SessionReviewError(
          "This class changed since you opened it. Refresh the page and look again.",
          409,
        );
      }

      const fromStatus = session.status as SessionStatusValue;
      const kind = adminReviewKind({ status: fromStatus, confirmation: session.confirmation });

      if (!kind) {
        throw new SessionReviewError("This class isn't waiting for an Admin decision.", 409);
      }

      const changed = session.status !== toStatus;

      if (!changed && kind === "OVERRIDE") {
        throw new SessionReviewError("That is already the recorded outcome.", 400);
      }

      const oldPlan = planSessionFollowUp(fromStatus, session.cancelledByRole);
      const undo = changed && oldPlan !== null && session.followUpAppliedAt !== null;

      const data: Prisma.ClassSessionUpdateManyMutationInput = {
        confirmation: OutcomeConfirmation.ADMIN_DECIDED,
        settledAt: now,
      };

      if (changed) {
        data.status = toStatus;

        if (toStatus === ClassSessionStatus.COMPLETED) {
          data.completedAt = session.endsAt ?? now;
          data.completedByRole = "ADMIN";
          // Counters are re-derived right after this commit, so the
          // "counters applied" marker is set with the outcome itself.
          data.countersAppliedAt = now;
        } else {
          data.completedAt = null;
          data.completedByRole = null;
          data.countersAppliedAt = null;
        }

        if (CANCEL_STATUSES.includes(toStatus)) {
          data.cancelledAt = now;
          data.cancelledByRole = "ADMIN";
          data.cancelReason = reason.slice(0, 500);
        } else {
          data.cancelledAt = null;
          data.cancelledByRole = null;
          data.cancelReason = null;
        }

        if (undo) data.followUpAppliedAt = null;
      }

      // Guarded write: only if nothing moved this session since it
      // was read a moment ago.
      const claimed = await tx.classSession.updateMany({
        where: { id: session.id, status: session.status, confirmation: session.confirmation },
        data,
      });

      if (claimed.count === 0) {
        throw new SessionReviewError(
          "This class changed at the same moment. Refresh the page and look again.",
          409,
        );
      }

      await tx.sessionOutcomeDecision.create({
        data: {
          classSessionId: session.id,
          kind: kind === "OVERRIDE" ? OutcomeDecisionKind.OVERRIDE : OutcomeDecisionKind.DECISION,
          fromStatus: session.status,
          toStatus,
          reason,
          decidedBySub: input.admin.sub,
          decidedByName: input.admin.name,
        },
      });

      let makeupLeftInPlace = false;

      if (undo) {
        makeupLeftInPlace = await undoFollowUp(tx, session, now);
      }

      return {
        enrollmentId: session.enrollmentId,
        kind,
        changed,
        fromStatus,
        fromCancelledByRole: session.cancelledByRole,
        cycleWasClosed: session.cycle.status === CycleStatus.CLOSED,
        makeupLeftInPlace,
      };
    },
    { timeout: 15_000 },
  );

  const warnings: string[] = [];

  if (done.makeupLeftInPlace) {
    warnings.push(
      "A make-up class for this session had already started or finished, so it was left in place.",
    );
  }

  // Everything below runs after the decision is committed. A failure
  // is logged and reported, never thrown: the decision stands and the
  // sweep repairs whatever is missing (follow-up, cycle close, payout
  // release).
  if (done.changed) {
    try {
      if (done.cycleWasClosed) {
        warnings.push(...(await reconcileClosedCycle(cycleId)));
      }

      await recomputeEnrollmentCounters(done.enrollmentId);
      await runSessionFollowUps(input.sessionId, now);
    } catch (err) {
      console.error(`Follow-up after Admin decision on ${input.sessionId} failed:`, err);
      warnings.push(
        "The decision is saved, but updating the cycle didn't fully finish. The next sweep will complete it.",
      );
    }
  }

  // Part 2B: every decision settles the session it decided (this is
  // Admin's own action — nothing left for the parent to confirm), so
  // this may be the one that clears the last unsettled session of an
  // already-CLOSED cycle. Try releasing its payout right away, changed
  // or not, and regardless of the branch above.
  if (done.cycleWasClosed) {
    try {
      await releaseClosedCyclePayout(cycleId, now);
    } catch (err) {
      console.error(`Payout release after Admin decision on ${input.sessionId} failed:`, err);
      warnings.push(
        "The decision is saved, but releasing this cycle's payout didn't fully finish. The next sweep will complete it.",
      );
    }
  }

  const fromLabel = SESSION_STATUS_LABEL[done.fromStatus];
  const toLabel = SESSION_STATUS_LABEL[toStatus as SessionStatusValue];

  await logActivity({
    action: done.kind === "OVERRIDE" ? "SESSION_OUTCOME_OVERRIDDEN" : "SESSION_OUTCOME_DECIDED",
    actorRole: "ADMIN",
    actorId: input.admin.sub,
    actorName: input.admin.name,
    actorEmail: input.admin.email,
    description: done.changed
      ? `Admin ${done.kind === "OVERRIDE" ? "overrode" : "decided"} a class outcome: ${fromLabel} → ${toLabel}. Reason: ${reason.slice(0, 200)}`
      : `Admin reviewed a class and kept the outcome (${toLabel}). Reason: ${reason.slice(0, 200)}`,
    metadata: {
      sessionId: input.sessionId,
      enrollmentId: done.enrollmentId,
      cycleId,
      kind: done.kind,
      fromStatus: done.fromStatus,
      fromCancelledByRole: done.fromCancelledByRole,
      toStatus,
      reason,
    },
  });

  await notifySessionOutcomeDecided({
    sessionId: input.sessionId,
    outcomeLabel: toLabel,
    changed: done.changed,
    kind: done.kind,
  });

  return { warnings };
}
