import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Teacher strikes (Part 1C): a simple per-teacher record, written
 * once per lost class by `sessionFollowUp.service.ts` (teacher
 * no-show, teacher cancellation). This file is the read side for
 * Admin. Nothing acts on the count yet.
 */

export interface TeacherStrikeRow {
  id: string;
  teacherId: string;
  teacherName: string;
  reason: "TEACHER_NO_SHOW" | "TEACHER_CANCELLED";
  courseTitle: string | null;
  /** The class the strike is for. */
  classStartsAt: string | null;
  recordedAt: string;
}

const MAX_ROWS = 200;

/** Newest first; pass a teacherId to see one teacher's strikes. */
export async function listTeacherStrikes(teacherId?: string): Promise<TeacherStrikeRow[]> {
  const rows = await prisma.teacherStrike.findMany({
    where: teacherId ? { teacherId } : {},
    orderBy: { createdAt: "desc" },
    take: MAX_ROWS,
    select: {
      id: true,
      teacherId: true,
      reason: true,
      createdAt: true,
      teacher: { select: { firstName: true, lastName: true, visibleName: true } },
      classSession: {
        select: {
          startsAt: true,
          scheduledDate: true,
          enrollment: { select: { course: { select: { courseTitle: true } } } },
        },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    teacherId: row.teacherId,
    teacherName:
      row.teacher.visibleName?.trim() ||
      `${row.teacher.firstName} ${row.teacher.lastName}`.trim(),
    reason: row.reason,
    courseTitle: row.classSession.enrollment.course.courseTitle ?? null,
    classStartsAt: (row.classSession.startsAt ?? row.classSession.scheduledDate).toISOString(),
    recordedAt: row.createdAt.toISOString(),
  }));
}
