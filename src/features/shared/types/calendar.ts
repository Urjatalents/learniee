/** Shape returned by /api/parent/calendar and /api/teacher/calendar (see scheduleOccurrences.service.ts). */
export interface CalendarOccurrence {
  /** The underlying ClassSession id — used to link to the Join/Start-session flow. */
  id: string;
  date: string;
  time: string | null;
  /** ClassSessionStatus — SCHEDULED/COMPLETED/CANCELLED/MISSED, plus the Part 1B outcomes (STUDENT_NO_SHOW, TEACHER_NO_SHOW, CANCELLED_LATE, NEEDS_REVIEW). */
  status: string;
  /** Real start/end instants (ISO) — cycle-model sessions only, null on legacy ones. */
  startsAt: string | null;
  endsAt: string | null;
  enrollmentId: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  courseId: string;
  courseTitle: string | null;
  subject: string | null;
}
