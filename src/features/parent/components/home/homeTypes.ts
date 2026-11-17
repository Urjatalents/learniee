/**
 * Shapes the Parent Home screen renders. Today they are filled from
 * `homeSample.ts` (frontend-only phase); the backend step swaps the source
 * for the real hooks/API without touching the components.
 */
export interface HomeKid {
  id: string;
  name: string;
  first: string;
  grade: number;
  board: string;
}

export interface HomeClass {
  id: string;
  title: string;
  subject: string;
  teacherName: string;
  kidId: string;
  status: "enrolled" | "pending" | "completed";
  done: number;
  total: number;
  /** Days left in the current cycle. */
  left: number;
  /** Price per session in rupees. */
  price: number;
  renewed?: boolean;
}

export interface HomeSession {
  id: string;
  kind: "class" | "demo";
  /** Class id for classes, demo id for demos. */
  refId: string;
  title: string;
  subject: string;
  teacherName: string;
  kidId: string;
  start: Date;
  hasLink: boolean;
  status: "confirmed" | "done";
}

export interface HomeHomework {
  kidId: string;
  classId: string;
  title: string;
  subject: string;
  due: Date;
}

export interface HomeCourse {
  id: string;
  title: string;
  subject: string;
  teacherId: string;
  teacherName: string;
  rating: number | null;
  price: number;
  /** Inclusive grade range the course fits. */
  grades: [number, number];
}

export interface HomeChat {
  id: string;
  classId: string;
  teacherName: string;
  subject: string;
  kidId: string;
  last: string;
}

export interface HomeRescheduleAsk {
  id: string;
  classId: string;
  kidId: string;
  teacherName: string;
  subject: string;
}

export interface HomeData {
  firstName: string;
  kids: HomeKid[];
  classes: HomeClass[];
  sessions: HomeSession[];
  homework: HomeHomework[];
  courses: HomeCourse[];
  chats: HomeChat[];
  rescheduleAsks: HomeRescheduleAsk[];
  walletBalance: number;
  freeDemos: number;
  /** Titles of courses that already have a booked demo, per kid id. */
  bookedDemoTitles: Record<string, string[]>;
  /** Teacher id for each class id (used by recommendations). */
  classTeacherId: Record<string, string>;
}
