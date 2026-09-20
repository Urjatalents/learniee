import type { SessionStatusValue } from "@/features/shared/utils/sessionOutcome";

/**
 * What `GET /api/admin/session-reviews` returns (Part 2A) — sessions
 * whose outcome Admin has to decide, and the ones Admin decided
 * recently. All instants are ISO strings.
 */

export type SessionReviewReason = "NEEDS_REVIEW" | "REPORTED" | "DECIDED";

export interface SessionReviewHistoryEntry {
  id: string;
  kind: "DECISION" | "OVERRIDE";
  fromStatus: SessionStatusValue;
  toStatus: SessionStatusValue;
  reason: string;
  decidedByName: string | null;
  createdAt: string;
}

export interface SessionReviewItem {
  id: string;
  /** DECISION = settle a reported / needs-review class; OVERRIDE = change one Admin already decided. */
  kind: "DECISION" | "OVERRIDE";
  /** Why it is in the list. */
  reason: SessionReviewReason;
  status: SessionStatusValue;
  cancelledByRole: string | null;
  cancelReason: string | null;
  sessionNumber: number | null;
  startsAt: string | null;
  endsAt: string | null;
  teacherStartedAt: string | null;
  teacherEndedAt: string | null;
  studentJoinedAt: string | null;
  /** Time both were present, as a % of the class — null unless both joined. */
  overlapPercent: number | null;
  courseTitle: string | null;
  teacherName: string;
  studentName: string;
  parentName: string;
  /** The parent's own words, when they reported a problem. */
  reportNote: string | null;
  reportedAt: string | null;
  teacherSummary: string | null;
  cycle: {
    cycleNumber: number;
    status: "OPEN" | "CLOSED";
    countedSessionCount: number | null;
    forfeitedSessionCount: number | null;
  } | null;
  /** Newest first. */
  history: SessionReviewHistoryEntry[];
}

export interface SessionReviewListing {
  open: SessionReviewItem[];
  decided: SessionReviewItem[];
}

export interface SessionReviewDecisionResult {
  /** Things Admin should know about (e.g. a payout that had already moved). */
  warnings: string[];
}
