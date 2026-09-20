import "server-only";

import { prisma } from "@/lib/prisma";
import { EnrollmentStatus } from "@prisma/client";

import { ensureSessionsGenerated } from "@/features/shared/server/classSession.service";
import { resolveEndedSessionsForEnrollments } from "@/features/shared/server/sessionResolve.service";

/**
 * Reads calendar occurrences straight from the `ClassSession` table
 * (real, dated rows — see `classSession.service.ts`'s header) rather
 * than computing them on the fly from `scheduleDays`/`scheduleTime`
 * the way this file originally did before `ClassSession` existed.
 * `ensureSessionsGenerated` is called first for every enrollment in
 * scope so a month that hasn't been generated yet still shows up
 * (lazy/idempotent generation, no cron — see the service's header).
 *
 * Shared between the Parent calendar (`/api/parent/calendar`, one
 * child or all children) and the Teacher calendar
 * (`/api/teacher/calendar`, every student) — same read, just a
 * different `where` clause, same pattern as
 * `enrollmentApproval.service.ts`.
 *
 * Only `ACTIVE`/`LAPSED` enrollments are shown — those are the only
 * statuses where both approvals are done and a schedule was
 * actually agreed on (see `EnrollmentStatus`'s doc-comment: "ACTIVE
 * — lectures can be scheduled").
 */
const CALENDAR_STATUSES: EnrollmentStatus[] = [
  EnrollmentStatus.ACTIVE,
  EnrollmentStatus.LAPSED,
];

export interface CalendarOccurrence {
  id: string; // ClassSession id
  date: string; // YYYY-MM-DD, local calendar date
  time: string | null; // "HH:mm", null if scheduleTime was never set
  status: string; // ClassSessionStatus — SCHEDULED/COMPLETED/CANCELLED/MISSED + the Part 1B outcomes
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

const sessionInclude = {
  student: { select: { id: true, firstName: true, visibleName: true } },
  teacher: {
    select: { id: true, firstName: true, lastName: true, visibleName: true },
  },
  enrollment: {
    select: {
      subject: true,
      course: { select: { id: true, courseTitle: true, subject: true } },
    },
  },
} as const;

type SessionWithRelations = Awaited<
  ReturnType<typeof prisma.classSession.findMany<{ include: typeof sessionInclude }>>
>[number];

/** Parses "YYYY-MM" (defaults to the current month) into a [start, end) range. */
function resolveMonthRange(monthParam?: string) {
  const base = monthParam ? new Date(`${monthParam}-01T00:00:00`) : new Date();

  if (Number.isNaN(base.getTime())) {
    throw new Error("Invalid month — expected YYYY-MM.");
  }

  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 1);

  return { start, end };
}

function displayName(p: {
  firstName: string;
  lastName?: string;
  visibleName: string | null;
}) {
  return p.visibleName?.trim() || `${p.firstName} ${p.lastName ?? ""}`.trim();
}

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function toOccurrence(session: SessionWithRelations): CalendarOccurrence {
  return {
    id: session.id,
    date: toDateKey(new Date(session.scheduledDate)),
    time: session.scheduledTime,
    status: session.status,
    startsAt: session.startsAt ? session.startsAt.toISOString() : null,
    endsAt: session.endsAt ? session.endsAt.toISOString() : null,
    enrollmentId: session.enrollmentId,
    studentId: session.student.id,
    studentName: displayName(session.student),
    teacherId: session.teacher.id,
    teacherName: displayName(session.teacher),
    courseId: session.enrollment.course.id,
    courseTitle: session.enrollment.course.courseTitle,
    subject: session.enrollment.course.subject ?? session.enrollment.subject ?? null,
  };
}

async function occurrencesFor(
  enrollmentWhere: Parameters<typeof prisma.enrollment.findMany>[0],
  start: Date,
  end: Date,
): Promise<CalendarOccurrence[]> {
  const enrollments = await prisma.enrollment.findMany({
    ...enrollmentWhere,
    select: { id: true },
  });

  const enrollmentIds = enrollments.map((e) => e.id);

  if (enrollmentIds.length === 0) {
    return [];
  }

  // Lazy/idempotent generation — see classSession.service.ts header.
  await Promise.all(enrollmentIds.map((id) => ensureSessionsGenerated(id)));

  // Cycle-model sessions whose time is up get their outcome before
  // they're listed — the "read after its end time" trigger of
  // `resolveSession` (see sessionResolve.service.ts).
  await resolveEndedSessionsForEnrollments(enrollmentIds);

  const sessions = await prisma.classSession.findMany({
    where: {
      enrollmentId: { in: enrollmentIds },
      scheduledDate: { gte: start, lt: end },
    },
    include: sessionInclude,
    orderBy: { scheduledDate: "asc" },
  });

  return sessions.map(toOccurrence);
}

/**
 * A Parent's calendar. `studentId` optionally scopes to one child's
 * profile page — omitted, this returns every child's schedule
 * (each occurrence still carries `studentId`/`studentName` so the
 * client can color-code per child).
 */
export async function getParentCalendarOccurrences(
  parentId: string,
  monthParam?: string,
  studentId?: string,
) {
  const { start, end } = resolveMonthRange(monthParam);

  return occurrencesFor(
    {
      where: {
        parentId,
        status: { in: CALENDAR_STATUSES },
        ...(studentId ? { studentId } : {}),
      },
    },
    start,
    end,
  );
}

/** A Teacher's calendar — every scheduled class, across every enrolled student. */
export async function getTeacherCalendarOccurrences(
  teacherId: string,
  monthParam?: string,
) {
  const { start, end } = resolveMonthRange(monthParam);

  return occurrencesFor(
    {
      where: {
        teacherId,
        status: { in: CALENDAR_STATUSES },
      },
    },
    start,
    end,
  );
}
