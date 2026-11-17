/**
 * Shape of `GET /api/parent/dashboard` (Parent home, Oct 2026 redesign).
 *
 * Plain data only — every instant is an ISO string — so the server service
 * and the client components share these types without importing each other.
 * Parent-facing copy never names Admin (same rule as `enrollmentStatus.ts`).
 */

export interface DashboardKid {
  id: string;
  name: string;
  /** Numeric grade parsed from `Student.standard` ("Grade 8" -> 8); null if unknown. */
  grade: number | null;
}

export type DashboardClassStatus = "enrolled" | "pending" | "completed";

export interface DashboardClass {
  /** Enrollment id (links to `/parent/my-classes/[id]`). */
  id: string;
  studentId: string;
  title: string;
  subject: string;
  teacherName: string;
  status: DashboardClassStatus;
  /** Classes counted so far in the current cycle. */
  done: number;
  /** Classes planned in the current cycle. */
  total: number;
  /** Days until the current cycle ends (null for legacy / pending / completed). */
  daysLeft: number | null;
  /** Price of the next renewal (current cycle price), rupees. */
  renewalAmount: number;
  /** The renewal window is open (the Renew button works). */
  renewable: boolean;
}

export interface DashboardSession {
  id: string;
  enrollmentId: string;
  studentId: string;
  title: string;
  subject: string;
  teacherName: string;
  startsAt: string;
  endsAt: string;
}

export interface DashboardDemo {
  id: string;
  studentId: string;
  title: string;
  subject: string;
  teacherName: string;
  startsAt: string;
  joinWindow: {
    state: "NO_DEMO" | "NOT_YET" | "OPEN" | "CLOSED";
    opensAt: string | null;
    closesAt: string | null;
  };
}

export interface DashboardHomework {
  id: string;
  enrollmentId: string;
  studentId: string;
  title: string;
  subject: string;
  dueDate: string | null;
}

export interface DashboardChat {
  roomId: string;
  enrollmentId: string;
  studentId: string;
  teacherName: string;
  subject: string;
  lastMessageAt: string | null;
}

export type DashboardAttentionKind = "RESCHEDULE" | "SURVEY" | "RECONFIRM" | "RENEW";

export interface DashboardAttention {
  key: string;
  kind: DashboardAttentionKind;
  studentId: string | null;
  title: string;
  subtitle: string;
  ctaLabel: string;
  href: string;
  /** Sort key: lower first. */
  priority: number;
  /** Days left, to order renewals (soonest first). */
  daysLeft: number | null;
}

export interface DashboardCourseRec {
  courseId: string;
  title: string;
  subject: string;
  teacherName: string;
  /** Teacher's average review rating, null = new teacher. */
  rating: number | null;
  price: number;
  studentId: string;
  studentName: string;
  grade: number | null;
  reasons: string[];
  href: string;
}

export interface DashboardSetup {
  done: number;
  total: number;
  nextLabel: string;
  href: string;
}

export interface ParentDashboardData {
  serverNow: string;
  parentFirstName: string;
  meetEnabled: boolean;
  balance: number;
  freeDemosLeft: number;
  kids: DashboardKid[];
  classes: DashboardClass[];
  sessions: DashboardSession[];
  demos: DashboardDemo[];
  homework: DashboardHomework[];
  chats: DashboardChat[];
  attention: DashboardAttention[];
  recommendations: DashboardCourseRec[];
  setup: DashboardSetup | null;
  /** A finished demo whose survey was never opened: the page redirects to it once. */
  autoOpenSurveyId: string | null;
}
