import { logActivity } from "@/features/shared/server/activityLog.service";
import { releaseClosedCyclePayout } from "@/features/shared/server/cycleClose.service";
import { notifySessionOutcomeReported } from "@/features/shared/server/notificationTriggers.service";
import type { SessionFlowState } from "@/features/shared/types/sessionFlow";
import {
    canAddSummary,
    getConfirmationState,
    REPORT_NOTE_MAX_LENGTH,
    REPORT_NOTE_MIN_LENGTH,
    SESSION_SUMMARY_MAX_LENGTH
} from "@/features/shared/utils/outcomeConfirmation";
import {
    type SessionStatusValue
} from "@/features/shared/utils/sessionOutcome";
import { prisma } from "@/lib/prisma";
import {
    OutcomeConfirmation
} from "@prisma/client";
import "server-only";
import { loadAndSettle, requireCycleSession, SessionActor, SessionFlowError, toConfirmationInput } from './core';
import { reload, statusLabel, toState } from './state';

/**
 * Teacher adds (or edits) the short class summary once they have
 * ended the class. Stored on the session so the class page can show
 * it later (Part 2C).
 */
export async function saveSessionSummary(
  sessionId: string,
  teacherId: string,
  summary: string | null | undefined,
  now: Date = new Date(),
): Promise<SessionFlowState> {
  const actor: SessionActor = { role: "TEACHER", id: teacherId };
  const session = requireCycleSession(await loadAndSettle(sessionId, actor, now));

  const clean = (summary ?? "").replace(/\r\n/g, "\n").trim();

  if (clean.length === 0) {
    throw new SessionFlowError("Write a short summary of the class first.", 400);
  }

  if (clean.length > SESSION_SUMMARY_MAX_LENGTH) {
    throw new SessionFlowError(
      `Keep the summary under ${SESSION_SUMMARY_MAX_LENGTH} characters.`,
      400,
    );
  }

  if (!canAddSummary(session)) {
    throw new SessionFlowError(
      "You can add a summary once you have ended the class.",
      409,
    );
  }

  await prisma.classSession.updateMany({
    where: { id: session.id, teacherId },
    data: { teacherSummary: clean, teacherSummaryAt: now },
  });

  return reload(sessionId, actor, now);
}
/**
 * Parent taps "All good": the outcome is accepted and the session is
 * settled. Only while the 48-hour window is open; tapping again (or
 * after it was accepted some other way) just returns the state.
 */
export async function confirmSessionOutcome(
  sessionId: string,
  parentId: string,
  now: Date = new Date(),
): Promise<SessionFlowState> {
  const actor: SessionActor = { role: "PARENT", id: parentId };
  const session = requireCycleSession(await loadAndSettle(sessionId, actor, now));
  const { phase } = getConfirmationState(toConfirmationInput(session), now);

  switch (phase) {
    case "NOT_FINAL":
      throw new SessionFlowError("This class isn't over yet.", 409);
    case "NEEDS_REVIEW":
      throw new SessionFlowError("An Admin is reviewing this class.", 409);
    case "REPORTED":
      throw new SessionFlowError(
        "You have already reported a problem with this class. An Admin will decide.",
        409,
      );
    case "ACCEPTED":
    case "DECIDED":
      return toState(session, "PARENT", now);
    case "OPEN":
      break;
  }

  await prisma.classSession.updateMany({
    // Re-checked inside the write so a report, an auto-accept or an
    // Admin decision that lands at the same moment can't be overwritten.
    where: { id: session.id, status: session.status, settledAt: null, confirmation: null },
    data: { confirmation: OutcomeConfirmation.PARENT_ACCEPTED, settledAt: now },
  });

  // Part 2B: this may have been the last unsettled session of an
  // already-CLOSED cycle — try to release its payout right away
  // rather than waiting for the sweep. Never blocks the response.
  if (session.cycleId) {
    releaseClosedCyclePayout(session.cycleId, now).catch((err) =>
      console.error(`Payout release after parent accept failed for cycle ${session.cycleId}:`, err),
    );
  }

  return reload(sessionId, actor, now);
}
/**
 * Parent taps "Report a problem": the session stays unsettled and
 * lands in the Admin queue until Admin decides. Only while the
 * 48-hour window is open, and only once.
 */
export async function reportSessionOutcome(
  sessionId: string,
  parentId: string,
  note: string | null | undefined,
  now: Date = new Date(),
): Promise<SessionFlowState> {
  const actor: SessionActor = { role: "PARENT", id: parentId };
  const session = requireCycleSession(await loadAndSettle(sessionId, actor, now));

  const cleanNote = (note ?? "").replace(/\r\n/g, "\n").trim();

  if (cleanNote.length < REPORT_NOTE_MIN_LENGTH) {
    throw new SessionFlowError("Please tell us briefly what went wrong.", 400);
  }

  if (cleanNote.length > REPORT_NOTE_MAX_LENGTH) {
    throw new SessionFlowError(
      `Keep the description under ${REPORT_NOTE_MAX_LENGTH} characters.`,
      400,
    );
  }

  const { phase } = getConfirmationState(toConfirmationInput(session), now);

  switch (phase) {
    case "NOT_FINAL":
      throw new SessionFlowError("This class isn't over yet.", 409);
    case "NEEDS_REVIEW":
      throw new SessionFlowError("An Admin is already reviewing this class.", 409);
    case "REPORTED":
      return toState(session, "PARENT", now);
    case "ACCEPTED":
      throw new SessionFlowError(
        "The 48-hour window for this class has passed, so it was accepted.",
        409,
      );
    case "DECIDED":
      throw new SessionFlowError("An Admin has already reviewed this class.", 409);
    case "OPEN":
      break;
  }

  const result = await prisma.classSession.updateMany({
    where: { id: session.id, status: session.status, settledAt: null, confirmation: null },
    data: {
      confirmation: OutcomeConfirmation.REPORTED,
      reportedAt: now,
      reportNote: cleanNote,
    },
  });

  if (result.count === 0) {
    throw new SessionFlowError(
      "This class just changed, so it can't be reported. Please refresh.",
      409,
    );
  }

  await logActivity({
    action: "SESSION_OUTCOME_REPORTED",
    actorRole: "PARENT",
    actorId: parentId,
    description: `Parent reported a problem with a class recorded as ${statusLabel(
      session.status as SessionStatusValue,
    )}.`,
    metadata: { sessionId: session.id, enrollmentId: session.enrollmentId, status: session.status },
  });

  await notifySessionOutcomeReported(session.id);

  return reload(sessionId, actor, now);
}
