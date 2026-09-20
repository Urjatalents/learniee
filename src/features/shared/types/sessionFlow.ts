import type { SessionStatusValue } from "@/features/shared/utils/sessionOutcome";

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
  /** "PARENT" | "TEACHER" | "SYSTEM" on a cancelled session. */
  cancelledByRole: string | null;
  /** Measured overlap as a % of the session, once both joined and it resolved. */
  overlapPercent: number | null;
  /** Last day (YYYY-MM-DD) the cycle's sessions can be held or moved to. */
  cycleDeadline: string | null;
  /** The student's name for a teacher, the teacher's name for a parent. */
  otherPartyName: string;
  courseTitle: string | null;
  serverNow: string;
}
