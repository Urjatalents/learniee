import type {
  ClassSessionItem,
  CycleProgressView,
  ParentClassSummary,
} from "@/features/parent/types/myClasses";

/** One card on the Teacher's "My Classes" list — one course. */
export interface TeacherClassSummary {
  courseId: string;
  courseTitle: string | null;
  subject: string | null;
  studentCount: number;
  activeStudentCount: number;
  /** Students with a class joinable (Start/Join open) right now. */
  liveNowCount: number;
  /** Soonest upcoming class across the course, if any. */
  nextSessionAt: string | null;
}

/** One row in a course's student roster ("Class live" page). */
export interface TeacherStudentRow {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  status: string;
  chatRoomId: string | null;
  /** Cycle progress / next class — reuses the Parent-side summary shape as-is. */
  classSummary: ParentClassSummary | null;
}

export interface TeacherClassRoster {
  course: { id: string; title: string | null; subject: string | null };
  students: TeacherStudentRow[];
}

/**
 * Shape of the Teacher's per-student "My Classes" page. Deliberately
 * close to the Parent's `ClassDetailView`
 * (`@/features/parent/types/myClasses`) — same cycle progress and
 * session-item shapes, reused as-is — but with the *parent's*
 * contact details instead of the teacher's own, since here the
 * viewer is the teacher looking at one of their students.
 */
export interface TeacherStudentDetailView {
  enrollment: {
    id: string;
    status: string;
    courseId: string;
    courseTitle: string | null;
    subject: string | null;
    studentName: string;
    parent: { name: string; phone: string; email: string };
    scheduleDays: number[];
    scheduleTime: string | null;
    sessionLengthMinutes: number | null;
    cyclesCompleted: number;
    chatRoomId: string | null;
  };
  progress: CycleProgressView | null;
  /** Classes still to come, soonest first. */
  upcoming: ClassSessionItem[];
  /** Classes with a result (or awaiting review), newest first. */
  history: ClassSessionItem[];
}
