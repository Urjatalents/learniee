import type { ConfirmationPhase } from "@/features/shared/utils/outcomeConfirmation";
import type { SessionStatusValue } from "@/features/shared/utils/sessionOutcome";

/**
 * Shapes of the Parent's "My Classes" page (Part 2C). Plain data
 * only — every instant is an ISO string and every calendar date a
 * "YYYY-MM-DD" key in the platform timezone — so the server service
 * and the client components share them without importing each other.
 *
 * Only cycle-model enrollments (activated after Part 1A) have any of
 * this; legacy enrollments keep their old view.
 */

/** Where the current cycle stands: "Session 3 of 9", day 12 of 45. */
export interface CycleProgressView {
  cycleNumber: number;
  status: "OPEN" | "CLOSED";
  startDate: string;
  endDate: string;
  /** Last day (day 45) the cycle's classes can be held or moved to. */
  deadline: string;
  /** Classes planned for the cycle (what was paid for). */
  sessionCount: number;
  /** Classes that have counted so far: held, student no-show, late cancel. */
  countedSessions: number;
  /**
   * The number of the next class to be held ("Session N of
   * `sessionCount`"). Null when no class is left to hold in this
   * cycle. A make-up takes the place of the class it replaces, so
   * this is "classes counted so far + 1", not a raw row number.
   */
  nextSessionNumber: number | null;
  /** Length of the completion window in days (45). */
  windowDays: number;
  /** 1..windowDays; 0 before the cycle has started. */
  dayOfWindow: number;
  /** Days left of the window, today included; 0 once it has passed. */
  daysLeft: number;
}

/** One class in the lists — upcoming or history. */
export interface ClassSessionItem {
  id: string;
  cycleNumber: number | null;
  sessionNumber: number | null;
  isMakeup: boolean;
  /** "YYYY-MM-DD". */
  scheduledDate: string;
  startsAt: string;
  endsAt: string;
  status: SessionStatusValue;
  cancelledByRole: string | null;
  /** The teacher's short class summary, once they have written one. */
  summary: string | null;
  summaryUpdatedAt: string | null;
  /** Where the parent's "All good" / "Report a problem" stands for this class. */
  confirmationPhase: ConfirmationPhase;
  /** The parent's 48 hours are open: show "All good" / "Report a problem". */
  canRespond: boolean;
  windowEndsAt: string | null;
}

export interface NextClassView {
  id: string;
  startsAt: string;
  endsAt: string;
  isMakeup: boolean;
}

/** What one card on the My Classes list needs beyond the enrollment itself. */
export interface ParentClassSummary {
  progress: CycleProgressView | null;
  nextClass: NextClassView | null;
  /** Classes waiting for "All good" / "Report a problem". */
  needsResponseCount: number;
}

export interface ClassTeacherInfo {
  id: string;
  name: string;
  photoUrl: string | null;
  location: string | null;
  aboutMe: string | null;
}

/** Everything the class detail page shows. */
export interface ClassDetailView {
  enrollment: {
    id: string;
    status: string;
    courseId: string;
    courseTitle: string | null;
    subject: string | null;
    studentName: string;
    teacher: ClassTeacherInfo;
    scheduleDays: number[];
    scheduleTime: string | null;
    /** Length of each class, locked at booking. */
    sessionLengthMinutes: number | null;
    cyclesCompleted: number;
    chatRoomId: string | null;
  };
  progress: CycleProgressView | null;
  /** Classes still to come, soonest first — the first is the "next class". */
  upcoming: ClassSessionItem[];
  /** Classes with a result (or awaiting review), newest first. */
  history: ClassSessionItem[];
  needsResponseCount: number;
}
