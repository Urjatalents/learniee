import "server-only";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

import { SESSION_POLICY } from "@/lib/platformConfig";
import { getEnrollmentsForTeacher } from "@/features/shared/server/enrollmentApproval.service";
import { resolveEndedSessionsForEnrollments } from "@/features/shared/server/sessionResolve.service";
import { displayName } from "@/features/shared/utils/displayName";
import {
  buildCycleProgress,
  hasTimes,
  pickCurrentCycle,
  summarizeEnrollment,
  toClassSessionItem,
  upcomingSessions,
  type CycleInput,
  type SessionInput,
} from "@/features/parent/utils/classProgress";
import { usesClassView } from "@/features/parent/utils/classView";
import type { ParentClassSummary } from "@/features/parent/types/myClasses";
import type {
  TeacherClassRoster,
  TeacherClassSummary,
  TeacherStudentDetailView,
  TeacherStudentRow,
} from "@/features/teacher/types/myClasses";

/**
 * Data behind the Teacher's "My Classes" page: courses ("classes")
 * with enrolled students grouped under them, and — for one student —
 * the same cycle progress / upcoming / history view the Parent gets
 * on their own My Classes page (Part 2C), seen from the Teacher's
 * side.
 *
 * Read-only. Reuses the pure, role-agnostic helpers built for the
 * Parent's My Classes page (`@/features/parent/utils/classProgress`,
 * `classView`) — they take plain cycle/session rows and a clock, no
 * Prisma or auth of their own, so there is nothing Parent-specific
 * about using them here too. The role-scoped `where` on every query
 * is the teacher's own id (via `getEnrollmentsForTeacher`, or a
 * direct `where: { teacherId }` below) — a teacher can only ever see
 * their own students.
 */

export class TeacherMyClassesError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const MAX_SESSIONS_PER_ENROLLMENT = 500;

const cycleSelect = {
  id: true,
  enrollmentId: true,
  cycleNumber: true,
  status: true,
  startDate: true,
  endDate: true,
  sessionCount: true,
} satisfies Prisma.EnrollmentCycleSelect;

const sessionSelect = {
  id: true,
  enrollmentId: true,
  cycleId: true,
  sessionNumber: true,
  status: true,
  cancelledByRole: true,
  makeupForSessionId: true,
  scheduledDate: true,
  startsAt: true,
  endsAt: true,
  confirmation: true,
  settledAt: true,
  resolvedAt: true,
  cancelledAt: true,
  teacherSummary: true,
  teacherSummaryAt: true,
} satisfies Prisma.ClassSessionSelect;

type CycleRow = Prisma.EnrollmentCycleGetPayload<{ select: typeof cycleSelect }>;
type SessionRow = Prisma.ClassSessionGetPayload<{ select: typeof sessionSelect }>;

function toCycleInput(row: CycleRow): CycleInput {
  return {
    id: row.id,
    cycleNumber: row.cycleNumber,
    status: row.status,
    startDate: row.startDate,
    endDate: row.endDate,
    sessionCount: row.sessionCount,
  };
}

function toSessionInput(row: SessionRow): SessionInput {
  return {
    id: row.id,
    cycleId: row.cycleId,
    sessionNumber: row.sessionNumber,
    status: row.status,
    cancelledByRole: row.cancelledByRole,
    makeupForSessionId: row.makeupForSessionId,
    scheduledDate: row.scheduledDate,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    confirmation: row.confirmation,
    settledAt: row.settledAt,
    resolvedAt: row.resolvedAt,
    cancelledAt: row.cancelledAt,
    teacherSummary: row.teacherSummary,
    teacherSummaryAt: row.teacherSummaryAt,
  };
}

function groupByEnrollment<T extends { enrollmentId: string }>(rows: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();

  for (const row of rows) {
    const list = grouped.get(row.enrollmentId);

    if (list) {
      list.push(row);
    } else {
      grouped.set(row.enrollmentId, [row]);
    }
  }

  return grouped;
}

async function loadClassSummaries(
  enrollmentIds: string[],
  now: Date,
): Promise<Map<string, ParentClassSummary>> {
  const summaries = new Map<string, ParentClassSummary>();

  if (enrollmentIds.length === 0) return summaries;

  await resolveEndedSessionsForEnrollments(enrollmentIds, now);

  const [cycleRows, sessionRows] = await Promise.all([
    prisma.enrollmentCycle.findMany({
      where: { enrollmentId: { in: enrollmentIds } },
      select: cycleSelect,
    }),
    prisma.classSession.findMany({
      where: { enrollmentId: { in: enrollmentIds }, cycleId: { not: null } },
      select: sessionSelect,
    }),
  ]);

  const cyclesByEnrollment = groupByEnrollment(cycleRows);
  const sessionsByEnrollment = groupByEnrollment(sessionRows);

  for (const enrollmentId of enrollmentIds) {
    summaries.set(
      enrollmentId,
      summarizeEnrollment(
        (cyclesByEnrollment.get(enrollmentId) ?? []).map(toCycleInput),
        (sessionsByEnrollment.get(enrollmentId) ?? []).map(toSessionInput),
        now,
      ),
    );
  }

  return summaries;
}

/** A session the teacher could start/join right now (open 10 min before, until it ends). */
function isLiveNow(summary: ParentClassSummary, now: Date): boolean {
  if (!summary.nextClass) return false;

  const opensAt = new Date(summary.nextClass.startsAt).getTime() - SESSION_POLICY.joinOpensMinutesBefore * 60_000;
  const endsAt = new Date(summary.nextClass.endsAt).getTime();

  return now.getTime() >= opensAt && now.getTime() <= endsAt;
}

/**
 * One card per course this Teacher has students in ("classes"):
 * how many students are enrolled, how many are ACTIVE, how many have
 * a class joinable right now, and when the soonest upcoming class
 * across the course is.
 */
export async function getTeacherClasses(
  teacherId: string,
  now: Date = new Date(),
): Promise<TeacherClassSummary[]> {
  const enrollments = await getEnrollmentsForTeacher(teacherId);
  const cycleModel = enrollments.filter((enrollment) => usesClassView(enrollment));

  const summaries = await loadClassSummaries(
    cycleModel.map((enrollment) => enrollment.id),
    now,
  );

  const byCourse = new Map<string, { courseTitle: string | null; subject: string | null; enrollments: typeof enrollments }>();

  for (const enrollment of enrollments) {
    const entry = byCourse.get(enrollment.course.id);

    if (entry) {
      entry.enrollments.push(enrollment);
    } else {
      byCourse.set(enrollment.course.id, {
        courseTitle: enrollment.course.courseTitle,
        subject: enrollment.course.subject,
        enrollments: [enrollment],
      });
    }
  }

  const classes: TeacherClassSummary[] = [];

  for (const [courseId, { courseTitle, subject, enrollments: courseEnrollments }] of byCourse) {
    let activeStudentCount = 0;
    let liveNowCount = 0;
    let nextSessionAt: number | null = null;

    for (const enrollment of courseEnrollments) {
      if (enrollment.status === "ACTIVE") activeStudentCount += 1;

      const summary = summaries.get(enrollment.id);
      if (!summary) continue;

      if (isLiveNow(summary, now)) liveNowCount += 1;

      if (summary.nextClass) {
        const startsAt = new Date(summary.nextClass.startsAt).getTime();
        if (nextSessionAt === null || startsAt < nextSessionAt) nextSessionAt = startsAt;
      }
    }

    classes.push({
      courseId,
      courseTitle,
      subject,
      studentCount: courseEnrollments.length,
      activeStudentCount,
      liveNowCount,
      nextSessionAt: nextSessionAt !== null ? new Date(nextSessionAt).toISOString() : null,
    });
  }

  // Classes with something live right now first, then the soonest next class.
  return classes.sort((a, b) => {
    if (a.liveNowCount !== b.liveNowCount) return b.liveNowCount - a.liveNowCount;
    if (a.nextSessionAt && b.nextSessionAt) {
      return new Date(a.nextSessionAt).getTime() - new Date(b.nextSessionAt).getTime();
    }
    if (a.nextSessionAt) return -1;
    if (b.nextSessionAt) return 1;

    return (a.courseTitle ?? "").localeCompare(b.courseTitle ?? "");
  });
}

/** The enrolled students of one of this Teacher's courses — the "class live" roster. */
export async function getTeacherClassRoster(
  courseId: string,
  teacherId: string,
  now: Date = new Date(),
): Promise<TeacherClassRoster> {
  const enrollments = (await getEnrollmentsForTeacher(teacherId)).filter(
    (enrollment) => enrollment.course.id === courseId,
  );

  if (enrollments.length === 0) {
    throw new TeacherMyClassesError("Class not found, or you have no students in it.", 404);
  }

  const summaries = await loadClassSummaries(
    enrollments.filter((enrollment) => usesClassView(enrollment)).map((enrollment) => enrollment.id),
    now,
  );

  const students: TeacherStudentRow[] = enrollments
    .map((enrollment) => ({
      enrollmentId: enrollment.id,
      studentId: enrollment.student.id,
      studentName: displayName(enrollment.student),
      parentName: displayName(enrollment.parent),
      parentPhone: enrollment.parent.phone,
      parentEmail: enrollment.parent.email,
      status: enrollment.status,
      chatRoomId: enrollment.chatRoom?.id ?? null,
      classSummary: summaries.get(enrollment.id) ?? null,
    }))
    .sort((a, b) => a.studentName.localeCompare(b.studentName));

  return {
    course: {
      id: courseId,
      title: enrollments[0].course.courseTitle,
      subject: enrollments[0].course.subject,
    },
    students,
  };
}

/** One student's full class page for this Teacher — classes, homework (via its own panel) and chat. */
export async function getTeacherStudentDetail(
  enrollmentId: string,
  teacherId: string,
  now: Date = new Date(),
): Promise<TeacherStudentDetailView> {
  const enrollment = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, teacherId },
    select: {
      id: true,
      status: true,
      isLegacy: true,
      subject: true,
      courseId: true,
      scheduleDays: true,
      scheduleTime: true,
      sessionLengthMinutes: true,
      cyclesCompleted: true,
      course: { select: { courseTitle: true, subject: true } },
      student: { select: { firstName: true, lastName: true, visibleName: true } },
      parent: {
        select: { firstName: true, lastName: true, visibleName: true, email: true, phone: true },
      },
      chatRoom: { select: { id: true } },
    },
  });

  if (!enrollment) {
    throw new TeacherMyClassesError("Student not found, or doesn't belong to you.", 404);
  }

  if (!usesClassView(enrollment)) {
    throw new TeacherMyClassesError("This enrollment uses the older class view.", 409);
  }

  await resolveEndedSessionsForEnrollments([enrollment.id], now);

  const [cycleRows, sessionRows] = await Promise.all([
    prisma.enrollmentCycle.findMany({
      where: { enrollmentId: enrollment.id },
      select: cycleSelect,
      orderBy: { cycleNumber: "asc" },
    }),
    prisma.classSession.findMany({
      where: { enrollmentId: enrollment.id, cycleId: { not: null } },
      select: sessionSelect,
      orderBy: { startsAt: "asc" },
      take: MAX_SESSIONS_PER_ENROLLMENT,
    }),
  ]);

  const cycles = cycleRows.map(toCycleInput);
  const timed = sessionRows.map(toSessionInput).filter(hasTimes);
  const cycleNumbers = new Map(cycles.map((cycle) => [cycle.id, cycle.cycleNumber]));

  const currentCycle = pickCurrentCycle(cycles);
  const upcoming = upcomingSessions(timed, now).map((session) =>
    toClassSessionItem(session, cycleNumbers, now),
  );

  const history = timed
    .filter((session) => session.status !== "SCHEDULED")
    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())
    .map((session) => toClassSessionItem(session, cycleNumbers, now));

  return {
    enrollment: {
      id: enrollment.id,
      status: enrollment.status,
      courseId: enrollment.courseId,
      courseTitle: enrollment.course.courseTitle,
      subject: enrollment.subject ?? enrollment.course.subject ?? null,
      studentName: displayName(enrollment.student),
      parent: {
        name: displayName(enrollment.parent),
        phone: enrollment.parent.phone,
        email: enrollment.parent.email,
      },
      scheduleDays: enrollment.scheduleDays,
      scheduleTime: enrollment.scheduleTime,
      sessionLengthMinutes: enrollment.sessionLengthMinutes,
      cyclesCompleted: enrollment.cyclesCompleted,
      chatRoomId: enrollment.chatRoom?.id ?? null,
    },
    progress: currentCycle ? buildCycleProgress(currentCycle, timed, now) : null,
    upcoming,
    history,
  };
}
