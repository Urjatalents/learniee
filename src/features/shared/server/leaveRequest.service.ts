import "server-only";

import { prisma } from "@/lib/prisma";
import { LeaveRequestStatus } from "@prisma/client";
import {
  notifyLeaveRequestSubmitted,
  notifyLeaveRequestResponded,
} from "@/features/shared/server/notificationTriggers.service";
import { applyApprovedLeaveToSessions } from "@/features/shared/server/leaveShift.service";

/**
 * Teacher leave requests — single-step Teacher -> Admin approval.
 * See the `LeaveRequest` model's doc-comment in `schema.prisma` for
 * the full picture. Unlike `RescheduleRequest` (Teacher <-> Parent,
 * tied to one ClassSession), a leave is a date range on the
 * Teacher's own calendar and only Admin has a say on it — approve or
 * reject, no counter-proposal step.
 *
 * Lives in `features/shared/server` (not `features/teacher/server`)
 * because both the Teacher and Admin routes act on the same rows,
 * same reasoning as `enrollmentApproval.service.ts`.
 */

export class LeaveRequestError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Same "date-only, local midnight" convention used elsewhere (ClassSession, RescheduleRequest). */
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseDateOnly(value: string, label: string): Date {
  const parsed = new Date(value.length <= 10 ? `${value}T00:00:00` : value);

  if (Number.isNaN(parsed.getTime())) {
    throw new LeaveRequestError(`Invalid ${label}.`);
  }

  return startOfDay(parsed);
}

const MAX_REASON_LENGTH = 500;

export interface CreateLeaveRequestInput {
  teacherId: string;
  startDate: string;
  endDate: string;
  reason: string;
}

/**
 * Teacher raises a new leave request, PENDING until Admin responds.
 * No limit today on overlapping/duplicate date ranges — a teacher
 * can have more than one PENDING request in flight; Admin sees and
 * resolves each independently.
 */
export async function createLeaveRequest(input: CreateLeaveRequestInput) {
  const reason = input.reason?.trim() ?? "";

  if (!reason) {
    throw new LeaveRequestError("A reason is required.");
  }

  if (reason.length > MAX_REASON_LENGTH) {
    throw new LeaveRequestError(`Reason must be ${MAX_REASON_LENGTH} characters or fewer.`);
  }

  const startDate = parseDateOnly(input.startDate, "start date");
  const endDate = parseDateOnly(input.endDate, "end date");

  const today = startOfDay(new Date());
  if (startDate < today) {
    throw new LeaveRequestError("Start date can't be in the past.");
  }

  if (endDate < startDate) {
    throw new LeaveRequestError("End date can't be before the start date.");
  }

  const created = await prisma.leaveRequest.create({
    data: {
      teacherId: input.teacherId,
      startDate,
      endDate,
      reason,
      status: LeaveRequestStatus.PENDING,
    },
  });

  await notifyLeaveRequestSubmitted(input.teacherId);

  return created;
}

/** Every leave request this Teacher has raised, newest first. */
export function listLeaveRequestsForTeacher(teacherId: string) {
  return prisma.leaveRequest.findMany({
    where: { teacherId },
    orderBy: { createdAt: "desc" },
  });
}

/** The Teacher withdraws their own still-pending request. */
export async function cancelLeaveRequest(input: { requestId: string; teacherId: string }) {
  const request = await prisma.leaveRequest.findUnique({
    where: { id: input.requestId },
  });

  if (!request || request.teacherId !== input.teacherId) {
    throw new LeaveRequestError("Leave request not found, or doesn't belong to you.", 404);
  }

  if (request.status !== LeaveRequestStatus.PENDING) {
    throw new LeaveRequestError(
      "This request has already been responded to and can't be withdrawn.",
      409,
    );
  }

  return prisma.leaveRequest.update({
    where: { id: request.id },
    data: { status: LeaveRequestStatus.CANCELLED, respondedAt: new Date() },
  });
}

const teacherSelect = {
  id: true,
  firstName: true,
  lastName: true,
  visibleName: true,
  email: true,
} as const;

/** Every leave request across every Teacher, newest first — Admin's full view (pending + resolved). */
export function listLeaveRequestsForAdmin() {
  return prisma.leaveRequest.findMany({
    include: { teacher: { select: teacherSelect } },
    orderBy: { createdAt: "desc" },
  });
}

export interface RespondToLeaveRequestInput {
  requestId: string;
  decision: "APPROVE" | "REJECT";
  adminNote?: string | null;
}

/** Admin approves or rejects a still-PENDING leave request — terminal either way. */
export async function respondToLeaveRequest(input: RespondToLeaveRequestInput) {
  const request = await prisma.leaveRequest.findUnique({
    where: { id: input.requestId },
  });

  if (!request) {
    throw new LeaveRequestError("Leave request not found.", 404);
  }

  if (request.status !== LeaveRequestStatus.PENDING) {
    throw new LeaveRequestError("This request isn't pending anymore.", 409);
  }

  const updated = await prisma.leaveRequest.update({
    where: { id: request.id },
    data: {
      status:
        input.decision === "APPROVE" ? LeaveRequestStatus.APPROVED : LeaveRequestStatus.REJECTED,
      adminNote: input.adminNote?.trim() || null,
      respondedAt: new Date(),
    },
    include: { teacher: { select: teacherSelect } },
  });

  await notifyLeaveRequestResponded(request.teacherId, input.decision === "APPROVE");

  // Part 1C: an approved leave shifts the teacher's affected cycle
  // sessions to the next free slots inside each cycle's 45 days and
  // tells the parents. The approval is already saved, so a failure
  // here must not undo it — the sweep re-applies approved leaves.
  if (input.decision === "APPROVE") {
    try {
      await applyApprovedLeaveToSessions(updated.id);
    } catch (err) {
      console.error(`Applying approved leave ${updated.id} to sessions failed:`, err);
    }
  }

  return updated;
}
