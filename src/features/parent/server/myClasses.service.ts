import "server-only";

import { prisma } from "@/lib/prisma";
import { TeacherFileType, type Prisma } from "@prisma/client";

import { createPresignedDownloadUrl } from "@/lib/s3";
import { getEnrollmentsForParent } from "@/features/parent/server/enrollment.service";
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
import type {
  ClassDetailView,
  ParentClassSummary,
} from "@/features/parent/types/myClasses";

/**
 * Data behind the Parent's "My Classes" page (Part 2C): the
 * enrollment list with each cycle-model enrollment's progress and
 * next class, and one enrollment's full page (cycle progress,
 * upcoming classes, session history with the teacher's summaries).
 *
 * Read-only. Before listing any sessions it settles the ones whose
 * time is up (`resolveEndedSessionsForEnrollments` — the same
 * "read after the end time" trigger the calendar and the teacher's
 * session list use), so the page never shows a finished class as
 * still scheduled. The role-scoped `where` on every query is the
 * parent's own id — a parent can only ever see their own enrollments.
 */

export class MyClassesError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Upper bound on the sessions read for one enrollment (a cycle is about a month of classes). */
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

/** Groups rows by their enrollment id. */
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

/**
 * Every enrollment of the parent — the same rows `/parent/enrollments`
 * always returned — plus `classSummary` on the cycle-model ones that
 * use the new page (null on the rest, which keep their old view).
 */
export async function getMyClassesForParent(parentId: string, now: Date = new Date()) {
  const enrollments = await getEnrollmentsForParent(parentId);

  const summaries = await loadClassSummaries(
    enrollments.filter((enrollment) => usesClassView(enrollment)).map((enrollment) => enrollment.id),
    now,
  );

  return enrollments.map((enrollment) => ({
    ...enrollment,
    classSummary: summaries.get(enrollment.id) ?? null,
  }));
}

async function teacherPhotoUrl(s3Key: string | undefined): Promise<string | null> {
  if (!s3Key) return null;

  try {
    return await createPresignedDownloadUrl(s3Key);
  } catch (err) {
    // A missing photo must never break the page.
    console.error("Teacher photo URL failed:", err);

    return null;
  }
}

/** One enrollment's full My Classes page. 404 if it isn't the parent's, 409 if it keeps the old view. */
export async function getClassDetail(
  enrollmentId: string,
  parentId: string,
  now: Date = new Date(),
): Promise<ClassDetailView> {
  const enrollment = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, parentId },
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
      student: {
        select: { firstName: true, lastName: true, visibleName: true },
      },
      teacher: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          visibleName: true,
          aboutMe: true,
          city: true,
          country: true,
          files: {
            where: { type: TeacherFileType.PROFILE_PHOTO },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { s3Key: true },
          },
        },
      },
      chatRoom: { select: { id: true } },
    },
  });

  if (!enrollment) {
    throw new MyClassesError("Enrollment not found.", 404);
  }

  if (!usesClassView(enrollment)) {
    throw new MyClassesError("This enrollment uses the older class view.", 409);
  }

  await resolveEndedSessionsForEnrollments([enrollment.id], now);

  const [cycleRows, sessionRows, photoUrl] = await Promise.all([
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
    teacherPhotoUrl(enrollment.teacher.files[0]?.s3Key),
  ]);

  const cycles = cycleRows.map(toCycleInput);
  const timed = sessionRows.map(toSessionInput).filter(hasTimes);
  const cycleNumbers = new Map(cycles.map((cycle) => [cycle.id, cycle.cycleNumber]));

  const currentCycle = pickCurrentCycle(cycles);
  const upcoming = upcomingSessions(timed, now).map((session) =>
    toClassSessionItem(session, cycleNumbers, now),
  );

  // History: everything that is not still to come, newest first.
  // (A SCHEDULED class whose time has passed but could not be
  // resolved yet is neither — it shows up on the next read.)
  const history = timed
    .filter((session) => session.status !== "SCHEDULED")
    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())
    .map((session) => toClassSessionItem(session, cycleNumbers, now));

  const location = [enrollment.teacher.city, enrollment.teacher.country]
    .filter(Boolean)
    .join(", ");

  return {
    enrollment: {
      id: enrollment.id,
      status: enrollment.status,
      courseId: enrollment.courseId,
      courseTitle: enrollment.course.courseTitle,
      subject: enrollment.subject ?? enrollment.course.subject ?? null,
      studentName: displayName(enrollment.student),
      teacher: {
        id: enrollment.teacher.id,
        name: displayName(enrollment.teacher),
        photoUrl,
        location: location || null,
        aboutMe: enrollment.teacher.aboutMe,
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
    needsResponseCount: [...upcoming, ...history].filter((session) => session.canRespond).length,
  };
}
