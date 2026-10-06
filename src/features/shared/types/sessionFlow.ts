import type { ConfirmationPhase } from "@/features/shared/utils/outcomeConfirmation";
import type { SessionStatusValue } from "@/features/shared/utils/sessionOutcome";

/**
 * The after-class side of a cycle session (Part 2A): whether its
 * outcome is settled, and what this viewer may do about it.
 */
export interface SessionConfirmationView {
  phase: ConfirmationPhase;
  /** Accepted (by the parent or after 48 h) or decided by Admin. */
  settled: boolean;
  /** While `phase = OPEN`: when the parent's 48 hours run out (ISO). */
  windowEndsAt: string | null;
  /** Parent only: show "All good" / "Report a problem". */
  canRespond: boolean;
  /** Parent only: what they wrote if they reported a problem. */
  reportNote: string | null;
  reportedAt: string | null;
  /** Teacher only: may add or edit the class summary. */
  canEditSummary: boolean;
}

/**
 * What `GET /api/{teacher,parent}/class-sessions/[sessionId]` (and
 * every Start / Join / End / Cancel action) returns — one shape for
 * both roles. All instants are ISO strings; `serverNow` lets the page
 * correct for a wrong clock on the viewer's device.
 *
 * `isCycleSession = false` is an older (legacy) session: none of the
 * event fields apply and the page keeps its previous behaviour.
 */
export interface SessionFlowState {
  id: string;
  isCycleSession: boolean;
  status: SessionStatusValue;
  /** "YYYY-MM-DD" in the platform timezone. */
  scheduledDate: string;
  /** "HH:mm" in the platform timezone. */
  scheduledTime: string | null;
  startsAt: string | null;
  endsAt: string | null;
  /** 10 minutes before `startsAt` — when Start / Join opens. */
  joinOpensAt: string | null;
  /** From here a teacher can end a session the student never joined. */
  studentAbsentFrom: string | null;
  teacherStartedAt: string | null;
  teacherEndedAt: string | null;
  studentJoinedAt: string | null;
  /** "PARENT" | "TEACHER" | "SYSTEM" | "ADMIN" on a cancelled session. */
  cancelledByRole: string | null;
  /** Measured overlap as a % of the session, once both joined and it resolved. */
  overlapPercent: number | null;
  /** Last day (YYYY-MM-DD) the cycle's sessions can be held or moved to. */
  cycleDeadline: string | null;
  /** The student's name for a teacher, the teacher's name for a parent. */
  otherPartyName: string;
  courseTitle: string | null;
  /** Teacher only: the class summary they wrote (null for a parent, and when none). */
  summary: string | null;
  summaryUpdatedAt: string | null;
  /** Null on legacy sessions. */
  confirmation: SessionConfirmationView | null;
  /** Google Meet is switched on for the platform (false on legacy sessions). */
  meetingEnabled: boolean;
  /**
   * The Meet link — only for the viewer who has started (teacher) or
   * joined (parent) and only while the class is live; null otherwise,
   * including when the room couldn't be created yet.
   */
  meetingUri: string | null;
  /**
   * Teacher only: the Google account that must be used in Meet (their
   * login email) — recording only starts when they join with it.
   */
  meetingAccountEmail: string | null;
  /**
   * Teacher only: whether Google Meet has confirmed them as co-host of
   * this class. `PENDING` = not confirmed (yet) — retry from the page.
   * Null when there is no room, Meet is off, or the viewer is a parent.
   */
  meetingCohost: "CONFIRMED" | "PENDING" | null;
  /** Parent only: the student's name, to type in Meet if asked for a name. */
  studentName: string | null;
  serverNow: string;
}
