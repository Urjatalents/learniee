/**
 * Shapes the Parent Home screen renders. They are built from the real
 * `GET /api/parent/dashboard` response by `homeAdapter.ts`.
 */
export interface HomeKid {
  id: string;
  name: string;
  first: string;
  /** Numeric grade from the student's standard; null when unknown. */
  grade: number | null;
}

export interface HomeClass {
  /** Enrollment id. */
  id: string;
  title: string;
  subject: string;
  teacherName: string;
  kidId: string;
  status: "enrolled" | "pending" | "completed";
  done: number;
  total: number;
  /** Days left in the current cycle; null when there is no open cycle. */
  left: number | null;
  /** What the next renewal costs, in rupees. */
  renewalAmount: number;
}

export interface HomeSession {
  id: string;
  kind: "class" | "demo";
  title: string;
  subject: string;
  teacherName: string;
  kidId: string;
  start: Date;
  /** When the session stops being "live" on the home screen. */
  end: Date;
  /** A video room can be opened (Google Meet is enabled). */
  hasLink: boolean;
  /** Where the Join / View button goes. */
  href: string;
}

export interface HomeHomework {
  id: string;
  kidId: string;
  classId: string;
  title: string;
  subject: string;
  due: Date | null;
}

export interface HomeChat {
  id: string;
  classId: string;
  teacherName: string;
  subject: string;
  kidId: string;
  /** Short date of the last message ("23 Oct"), empty if none yet. */
  last: string;
}

export interface HomeAttention {
  key: string;
  /** null = applies to every learner. */
  kidId: string | null;
  priority: number;
  days: number | null;
  title: string;
  sub: string;
  button: string;
  href: string;
}

export interface HomeRecommendation {
  courseId: string;
  title: string;
  subject: string;
  teacherName: string;
  rating: number | null;
  price: number;
  kidId: string;
  href: string;
}

export interface HomeSetup {
  done: number;
  total: number;
  nextLabel: string;
  href: string;
}

export interface HomeData {
  firstName: string;
  kids: HomeKid[];
  classes: HomeClass[];
  sessions: HomeSession[];
  homework: HomeHomework[];
  chats: HomeChat[];
  attention: HomeAttention[];
  recommendations: HomeRecommendation[];
  setup: HomeSetup | null;
  walletBalance: number;
  freeDemos: number;
}
