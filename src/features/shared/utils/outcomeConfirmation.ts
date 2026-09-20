import { SESSION_POLICY } from "@/lib/platformConfig";
import { isSessionFinal, type SessionStatusValue } from "@/features/shared/utils/sessionOutcome";

/**
 * After-class rules of Part 2A, as pure functions (no database, no
 * clock of their own). Shared by the server services and the pages,
 * so a button is shown by exactly the rule the server enforces.
 *
 * Lifecycle of a cycle session's outcome:
 *
 *   SCHEDULED                  not final          unsettled
 *   NEEDS_REVIEW               Admin decides      unsettled
 *   final, window open         parent has 48 h    unsettled
 *   final, parent "All good"   accepted           SETTLED
 *   final, 48 h, no action     auto-accepted      SETTLED
 *   final, parent reported     Admin decides      unsettled
 *   Admin decided / overrode   decided            SETTLED
 *
 * The 48 hours run from the moment the outcome became final
 * (`resolvedAt`, or `cancelledAt` for a cancellation). Part 2B pays
 * out only when every session of a cycle is settled.
 */

export type ConfirmationValue =
  | "PARENT_ACCEPTED"
  | "AUTO_ACCEPTED"
  | "REPORTED"
  | "ADMIN_DECIDED";

export type ConfirmationPhase =
  | "NOT_FINAL"
  | "NEEDS_REVIEW"
  | "OPEN"
  | "REPORTED"
  | "ACCEPTED"
  | "DECIDED";

export const CONFIRMATION_WINDOW_MS = SESSION_POLICY.disputeWindowHours * 60 * 60_000;

export const SESSION_SUMMARY_MAX_LENGTH = 1000;
export const REPORT_NOTE_MIN_LENGTH = 5;
export const REPORT_NOTE_MAX_LENGTH = 1000;
export const DECISION_REASON_MIN_LENGTH = 5;
export const DECISION_REASON_MAX_LENGTH = 1000;

export interface ConfirmationInput {
  status: SessionStatusValue;
  confirmation: ConfirmationValue | null;
  settledAt: Date | null;
  resolvedAt: Date | null;
  cancelledAt: Date | null;
  endsAt: Date | null;
}

/** When the outcome became final — the start of the parent's 48 hours. */
export function outcomeFinalAt(
  session: Pick<ConfirmationInput, "resolvedAt" | "cancelledAt" | "endsAt">,
): Date | null {
  return session.resolvedAt ?? session.cancelledAt ?? session.endsAt ?? null;
}

export function confirmationWindowEndsAt(finalAt: Date): Date {
  return new Date(finalAt.getTime() + CONFIRMATION_WINDOW_MS);
}

export interface ConfirmationState {
  phase: ConfirmationPhase;
  /** Accepted or decided by Admin — the flag Part 2B reads. */
  settled: boolean;
  /** When the parent's window closes; null when it no longer matters. */
  windowEndsAt: Date | null;
}

export function getConfirmationState(input: ConfirmationInput, now: Date): ConfirmationState {
  if (input.status === "SCHEDULED") {
    return { phase: "NOT_FINAL", settled: false, windowEndsAt: null };
  }

  if (input.status === "NEEDS_REVIEW") {
    return { phase: "NEEDS_REVIEW", settled: false, windowEndsAt: null };
  }

  if (input.settledAt) {
    return {
      phase: input.confirmation === "ADMIN_DECIDED" ? "DECIDED" : "ACCEPTED",
      settled: true,
      windowEndsAt: null,
    };
  }

  if (input.confirmation === "REPORTED") {
    return { phase: "REPORTED", settled: false, windowEndsAt: null };
  }

  const finalAt = outcomeFinalAt(input);

  if (!finalAt) {
    return { phase: "NOT_FINAL", settled: false, windowEndsAt: null };
  }

  const windowEndsAt = confirmationWindowEndsAt(finalAt);

  // 48 hours passed with no action: accepted. (The database write
  // that records it is `acceptExpiredConfirmations`; until it runs,
  // the answer is derived here so it is never wrong.)
  if (now.getTime() >= windowEndsAt.getTime()) {
    return { phase: "ACCEPTED", settled: true, windowEndsAt: null };
  }

  return { phase: "OPEN", settled: false, windowEndsAt };
}

export function isOutcomeSettled(input: ConfirmationInput, now: Date): boolean {
  return getConfirmationState(input, now).settled;
}

/** Parent may tap "All good" / "Report a problem" only while the window is open. */
export function canParentRespond(input: ConfirmationInput, now: Date): boolean {
  return getConfirmationState(input, now).phase === "OPEN";
}

/**
 * The teacher may add (or edit) the class summary once they have
 * ended the class — or, when it was resolved without an End tap,
 * once it has a final outcome and they had started it.
 */
export function canAddSummary(session: {
  status: SessionStatusValue;
  teacherStartedAt: Date | null;
  teacherEndedAt: Date | null;
}): boolean {
  if (session.teacherEndedAt !== null) return true;

  return session.teacherStartedAt !== null && isSessionFinal(session.status);
}

/** Which Admin action a session is open to, or null when it is not in Admin's hands. */
export function adminReviewKind(session: {
  status: SessionStatusValue;
  confirmation: ConfirmationValue | null;
}): "DECISION" | "OVERRIDE" | null {
  if (session.status === "NEEDS_REVIEW") return "DECISION";
  if (session.confirmation === "REPORTED") return "DECISION";
  if (session.confirmation === "ADMIN_DECIDED") return "OVERRIDE";

  return null;
}

/** The outcomes Admin can set, with what each one means for the cycle. */
export const ADMIN_DECISION_OPTIONS = [
  {
    status: "COMPLETED",
    label: "Completed",
    hint: "The class was held. Counts; the teacher is paid.",
  },
  {
    status: "STUDENT_NO_SHOW",
    label: "Student absent",
    hint: "The teacher was there, the student wasn't. Counts; the teacher is paid.",
  },
  {
    status: "TEACHER_NO_SHOW",
    label: "Teacher absent",
    hint: "The teacher didn't show. Doesn't count; a make-up is scheduled and a strike is recorded.",
  },
  {
    status: "CANCELLED_LATE",
    label: "Cancelled late",
    hint: "Cancelled with under 4 hours' notice. Counts; the teacher is paid.",
  },
  {
    status: "CANCELLED",
    label: "Cancelled",
    hint: "The class didn't happen. Doesn't count; no make-up and no strike.",
  },
] as const satisfies readonly { status: SessionStatusValue; label: string; hint: string }[];

export type AdminDecisionStatus = (typeof ADMIN_DECISION_OPTIONS)[number]["status"];

export function isAdminDecisionStatus(value: unknown): value is AdminDecisionStatus {
  return ADMIN_DECISION_OPTIONS.some((option) => option.status === value);
}
