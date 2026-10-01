import "server-only";

import {
  ClassRequestResponseStatus,
  ClassRequestStatus,
  Prisma,
  TeacherApprovalStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getStandardPrice } from "@/features/courses/utils/coursePricing";
import { formatSchedule } from "@/features/shared/utils/weekdays";
import {
  notifyClassRequestAccepted,
  notifyClassRequestReviewed,
  notifyClassRequestSubmitted,
  notifyClassRequestVacancy,
} from "@/features/shared/server/notificationTriggers.service";

/**
 * Custom class requests (Oct 2026).
 *
 * Flow: Parent submits (PENDING_REVIEW) -> Admin approves (OPEN, which is the
 * "vacancy" every approved Teacher sees) or rejects -> a Teacher accepts or
 * declines -> an accepting Teacher lists a normal Course for it (it still goes
 * through the usual course approval) -> Parents join through the Courses page.
 *
 * Teachers never receive the Parent's identity, only the learner's grade.
 * Same shared-service layout as `complaint.service.ts` because three roles
 * touch the same rows.
 */

export class ClassRequestError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const MAX_TITLE = 120;
const MAX_SUBJECT = 80;
const MAX_DESCRIPTION = 2000;
const MAX_NOTE = 500;
/** Stops one account flooding the Admin queue. */
const MAX_PENDING_PER_PARENT = 5;

export interface CreateClassRequestInput {
  studentId?: string | null;
  title?: string;
  subject?: string;
  grade?: string | null;
  board?: string | null;
  language?: string | null;
  /** Weekdays, 0 = Sunday. Number of classes per week = how many are picked. */
  preferredDays?: unknown;
  /** "HH:mm" */
  preferredTime?: string | null;
  description?: string;
}

/** Fixed per-class price for a grade — the same tier rate the course listing uses. */
export function priceForGrade(grade: string | null | undefined): number | null {
  return getStandardPrice(grade || null, false);
}

function parseDays(value: unknown): number[] {
  if (!Array.isArray(value)) return [];

  const days = value.map((d) => Number(d));

  if (days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
    throw new ClassRequestError("Preferred days are invalid.");
  }

  return [...new Set(days)].sort((a, b) => a - b);
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(value: unknown, max: number, label: string): string | null {
  const text = clean(value);

  if (!text) return null;

  if (text.length > max) {
    throw new ClassRequestError(`${label} must be ${max} characters or fewer.`);
  }

  return text;
}

function requiredText(value: unknown, max: number, label: string): string {
  const text = clean(value);

  if (!text) {
    throw new ClassRequestError(`${label} is required.`);
  }

  if (text.length > max) {
    throw new ClassRequestError(`${label} must be ${max} characters or fewer.`);
  }

  return text;
}

/* ------------------------------------------------------------------ */
/* Parent                                                              */
/* ------------------------------------------------------------------ */

export async function createClassRequest(parentId: string, input: CreateClassRequestInput) {
  const title = requiredText(input.title, MAX_TITLE, "Title");
  const subject = requiredText(input.subject, MAX_SUBJECT, "Subject");
  const description = requiredText(input.description, MAX_DESCRIPTION, "Description");
  const grade = optionalText(input.grade, 40, "Grade");
  const board = optionalText(input.board, 40, "Board");
  const language = optionalText(input.language, 40, "Language");

  // The price is fixed per grade, so a grade is required to quote it.
  if (!grade || priceForGrade(grade) == null) {
    throw new ClassRequestError("Please select the grade — the class price is fixed by grade.");
  }

  const preferredDays = parseDays(input.preferredDays);
  const preferredTime = clean(input.preferredTime);

  if (preferredDays.length === 0) {
    throw new ClassRequestError("Please select at least one day for the classes.");
  }

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(preferredTime)) {
    throw new ClassRequestError("Please select a valid class time.");
  }

  let studentId: string | null = null;

  if (input.studentId) {
    // The child must belong to this parent — never trust a client-sent id.
    const student = await prisma.student.findFirst({
      where: { id: String(input.studentId), parentId },
      select: { id: true },
    });

    if (!student) {
      throw new ClassRequestError("Selected child was not found.", 404);
    }

    studentId = student.id;
  }

  const pending = await prisma.classRequest.count({
    where: { parentId, status: ClassRequestStatus.PENDING_REVIEW },
  });

  if (pending >= MAX_PENDING_PER_PARENT) {
    throw new ClassRequestError(
      `You already have ${MAX_PENDING_PER_PARENT} requests waiting for review. Please wait for a response first.`,
      429,
    );
  }

  const created = await prisma.classRequest.create({
    data: {
      parentId,
      studentId,
      title,
      subject,
      grade,
      board,
      language,
      sessionsPerWeek: preferredDays.length,
      preferredDays,
      preferredTime,
      // Readable copy for anything that still reads the old free-text field.
      preferredSchedule: formatSchedule(preferredDays, preferredTime),
      description,
    },
  });

  await notifyClassRequestSubmitted({ title, subject });

  return created;
}

export async function listClassRequestsForParent(parentId: string) {
  const requests = await prisma.classRequest.findMany({
    where: { parentId },
    orderBy: { createdAt: "desc" },
    include: {
      student: { select: { firstName: true, lastName: true, visibleName: true } },
      responses: {
        where: { status: ClassRequestResponseStatus.ACCEPTED },
        select: { id: true, course: { select: { id: true, courseTitle: true, status: true } } },
      },
    },
  });

  return requests.map(({ responses, student, budgetPerSession: _legacyBudget, ...rest }) => ({
    ...rest,
    pricePerSession: priceForGrade(rest.grade),
    studentName: student ? student.visibleName || `${student.firstName} ${student.lastName}`.trim() : null,
    acceptedCount: responses.length,
    // Only APPROVED courses are joinable, so only those count as "live".
    liveListings: responses
      .filter((r) => r.course?.status === "APPROVED")
      .map((r) => ({ courseId: r.course!.id, courseTitle: r.course!.courseTitle })),
  }));
}

/** Parent withdraws a request that is still waiting for review or open to teachers. */
export async function cancelClassRequestByParent(parentId: string, requestId: string) {
  const result = await prisma.classRequest.updateMany({
    where: {
      id: requestId,
      parentId,
      status: { in: [ClassRequestStatus.PENDING_REVIEW, ClassRequestStatus.OPEN] },
    },
    data: { status: ClassRequestStatus.CLOSED, closedAt: new Date() },
  });

  if (result.count === 0) {
    throw new ClassRequestError("This request can no longer be withdrawn.", 409);
  }
}

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

export async function listClassRequestsForAdmin() {
  const requests = await prisma.classRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      parent: { select: { firstName: true, lastName: true, visibleName: true, email: true } },
      student: { select: { firstName: true, lastName: true, visibleName: true } },
      responses: {
        select: {
          id: true,
          status: true,
          note: true,
          respondedAt: true,
          teacher: { select: { id: true, firstName: true, lastName: true, visibleName: true } },
          course: { select: { id: true, courseTitle: true, status: true } },
        },
        orderBy: { respondedAt: "asc" },
      },
    },
  });

  return requests.map(({ parent, student, budgetPerSession: _legacyBudget, ...rest }) => ({
    ...rest,
    pricePerSession: priceForGrade(rest.grade),
    parentName: parent.visibleName || `${parent.firstName} ${parent.lastName}`.trim(),
    parentEmail: parent.email,
    studentName: student ? student.visibleName || `${student.firstName} ${student.lastName}`.trim() : null,
  }));
}

export interface ReviewClassRequestInput {
  requestId: string;
  action: "APPROVE" | "REJECT" | "CLOSE";
  adminNote?: string | null;
  reviewedBySub: string;
}

/**
 * Admin decides on a request. APPROVE/REJECT only act on PENDING_REVIEW and CLOSE
 * only on OPEN — each is one conditional update, so a double click or two Admins
 * acting together can't apply it twice (or circulate the vacancy twice).
 */
export async function reviewClassRequest(input: ReviewClassRequestInput) {
  const adminNote = optionalText(input.adminNote, MAX_NOTE, "Note");
  const now = new Date();

  const existing = await prisma.classRequest.findUnique({
    where: { id: input.requestId },
    select: { id: true, parentId: true, title: true, subject: true, grade: true, status: true },
  });

  if (!existing) {
    throw new ClassRequestError("Request not found.", 404);
  }

  if (input.action === "REJECT" && !adminNote) {
    throw new ClassRequestError("Please give the parent a short reason for rejecting.");
  }

  if (input.action === "CLOSE") {
    const result = await prisma.classRequest.updateMany({
      where: { id: existing.id, status: ClassRequestStatus.OPEN },
      data: { status: ClassRequestStatus.CLOSED, closedAt: now, adminNote: adminNote ?? undefined },
    });

    if (result.count === 0) {
      throw new ClassRequestError("Only an open vacancy can be closed.", 409);
    }

    await notifyClassRequestReviewed({
      parentId: existing.parentId,
      title: existing.title,
      outcome: "CLOSED",
      adminNote,
    });

    return { ...existing, status: ClassRequestStatus.CLOSED };
  }

  const approve = input.action === "APPROVE";

  const result = await prisma.classRequest.updateMany({
    where: { id: existing.id, status: ClassRequestStatus.PENDING_REVIEW },
    data: {
      status: approve ? ClassRequestStatus.OPEN : ClassRequestStatus.REJECTED,
      adminNote,
      reviewedBySub: input.reviewedBySub,
      reviewedAt: now,
      circulatedAt: approve ? now : null,
    },
  });

  if (result.count === 0) {
    throw new ClassRequestError("This request has already been reviewed.", 409);
  }

  await notifyClassRequestReviewed({
    parentId: existing.parentId,
    title: existing.title,
    outcome: approve ? "APPROVED" : "REJECTED",
    adminNote,
  });

  if (approve) {
    await notifyClassRequestVacancy({
      title: existing.title,
      subject: existing.subject,
      grade: existing.grade,
    });
  }

  return { ...existing, status: approve ? ClassRequestStatus.OPEN : ClassRequestStatus.REJECTED };
}

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
