import {
    notifyClassRequestAccepted
} from "@/features/shared/server/notificationTriggers.service";
import { prisma } from "@/lib/prisma";
import {
    ClassRequestResponseStatus,
    ClassRequestStatus,
    Prisma,
    TeacherApprovalStatus,
} from "@prisma/client";
import "server-only";
import { ClassRequestError, MAX_NOTE, optionalText, priceForGrade } from './base';

/* ------------------------------------------------------------------ */
/* Teacher                                                             */
/* ------------------------------------------------------------------ */

/** Fields a Teacher may see. Deliberately has no parent/student identity. */
const VACANCY_SELECT = {
  id: true,
  title: true,
  subject: true,
  grade: true,
  board: true,
  language: true,
  sessionsPerWeek: true,
  preferredSchedule: true,
  preferredDays: true,
  preferredTime: true,
  description: true,
  circulatedAt: true,
} satisfies Prisma.ClassRequestSelect;
function shapeVacancy<T extends { grade: string | null }>(row: T) {
  return { ...row, pricePerSession: priceForGrade(row.grade) };
}
/**
 * Vacancies this Teacher can act on: every OPEN one, plus any closed one they
 * already answered (so an accepted Teacher can still reach "create listing").
 */
export async function listVacanciesForTeacher(teacherId: string) {
  const rows = await prisma.classRequest.findMany({
    where: {
      OR: [
        { status: ClassRequestStatus.OPEN },
        { responses: { some: { teacherId } } },
      ],
    },
    orderBy: { circulatedAt: "desc" },
    select: {
      ...VACANCY_SELECT,
      status: true,
      responses: {
        where: { teacherId },
        select: {
          status: true,
          note: true,
          respondedAt: true,
          course: { select: { id: true, courseTitle: true, status: true } },
        },
      },
    },
  });

  return rows
    .filter((r) => r.status === ClassRequestStatus.OPEN || r.responses.length > 0)
    .map(({ responses, ...rest }) => ({
      ...shapeVacancy(rest),
      myResponse: responses[0] ?? null,
    }));
}
export async function respondToVacancy(input: {
  teacherId: string;
  requestId: string;
  decision: "ACCEPT" | "DECLINE";
  note?: string | null;
}) {
  const note = optionalText(input.note, MAX_NOTE, "Note");

  const teacher = await prisma.teacher.findUnique({
    where: { id: input.teacherId },
    select: { id: true, approvalStatus: true, firstName: true, lastName: true, visibleName: true },
  });

  if (!teacher || teacher.approvalStatus !== TeacherApprovalStatus.APPROVED) {
    throw new ClassRequestError("Only approved teachers can respond to vacancies.", 403);
  }

  const request = await prisma.classRequest.findUnique({
    where: { id: input.requestId },
    select: { id: true, parentId: true, title: true, status: true },
  });

  if (!request || request.status !== ClassRequestStatus.OPEN) {
    throw new ClassRequestError("This vacancy is no longer open.", 409);
  }

  const accepted = input.decision === "ACCEPT";

  try {
    await prisma.classRequestResponse.create({
      data: {
        classRequestId: request.id,
        teacherId: teacher.id,
        status: accepted ? ClassRequestResponseStatus.ACCEPTED : ClassRequestResponseStatus.DECLINED,
        note,
      },
    });
  } catch (error) {
    // Unique (classRequestId, teacherId): a response is final.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ClassRequestError("You have already responded to this vacancy.", 409);
    }

    throw error;
  }

  if (accepted) {
    await notifyClassRequestAccepted({
      parentId: request.parentId,
      title: request.title,
      teacherName: teacher.visibleName || `${teacher.firstName} ${teacher.lastName}`.trim(),
    });
  }
}
/** One vacancy this Teacher accepted and hasn't listed a course for yet (prefills the course form). */
export async function getAcceptedVacancyForListing(teacherId: string, requestId: string) {
  const response = await prisma.classRequestResponse.findUnique({
    where: { classRequestId_teacherId: { classRequestId: requestId, teacherId } },
    select: {
      status: true,
      courseId: true,
      classRequest: { select: VACANCY_SELECT },
    },
  });

  if (!response || response.status !== ClassRequestResponseStatus.ACCEPTED) {
    throw new ClassRequestError("You haven't accepted this vacancy.", 404);
  }

  if (response.courseId) {
    throw new ClassRequestError("You've already created a listing for this vacancy.", 409);
  }

  return shapeVacancy(response.classRequest);
}
/** Throws unless this Teacher may still list a course for the vacancy. Call before creating the Course. */
export async function assertCanListCourseForVacancy(teacherId: string, requestId: string) {
  return getAcceptedVacancyForListing(teacherId, requestId);
}
/**
 * Links a freshly created Course to the Teacher's accepted response. Conditional
 * on `courseId` still being empty, so a double submit can only link one course.
 * Returns false if it didn't link (the Course then simply stays a normal listing).
 */
export async function attachCourseToVacancy(teacherId: string, requestId: string, courseId: string) {
  const result = await prisma.classRequestResponse.updateMany({
    where: {
      classRequestId: requestId,
      teacherId,
      status: ClassRequestResponseStatus.ACCEPTED,
      courseId: null,
    },
    data: { courseId },
  });

  return result.count === 1;
}
