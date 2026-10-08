import {
    notifyClassRequestReviewed,
    notifyClassRequestSubmitted,
    notifyClassRequestVacancy
} from "@/features/shared/server/notificationTriggers.service";
import { formatSchedule } from "@/features/shared/utils/weekdays";
import { prisma } from "@/lib/prisma";
import {
    ClassRequestResponseStatus,
    ClassRequestStatus
} from "@prisma/client";
import "server-only";
import { ClassRequestError, CreateClassRequestInput, MAX_DESCRIPTION, MAX_NOTE, MAX_PENDING_PER_PARENT, MAX_SUBJECT, MAX_TITLE, clean, optionalText, parseDays, priceForGrade, requiredText } from './base';

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
