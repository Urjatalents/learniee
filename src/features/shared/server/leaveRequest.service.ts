import "server-only";

import { prisma } from "@/lib/prisma";
import { LeaveRequestStatus } from "@prisma/client";
import {
  notifyLeaveRequestSubmitted,
  notifyLeaveRequestResponded,
} from "@/features/shared/server/notificationTriggers.service";
import {
  applyApprovedLeaveToSessions,
  previewLeaveImpact,
  type LeaveImpact,
} from "@/features/shared/server/leaveShift.service";
import { isEmergencyLeave } from "@/features/shared/utils/leaveRules";
import {
  calendarDateToDate,
  compareDates,
  parseDateKey,
  todayInPlatformTz,
  type CalendarDate,
} from "@/lib/platformTime";

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

/**
 * Phase 1.9: leave dates are platform-timezone calendar dates saved
 * as UTC midnight (`calendarDateToDate`) — the same convention the
 * leave shift and the slot search read them with — so nothing here
 * depends on the host's own timezone.
 */
function parseLeaveDate(value: string, label: string): CalendarDate {
  const parsed = parseDateKey(typeof value === "string" ? value.trim().slice(0, 10) : null);

  if (!parsed) {
    throw new LeaveRequestError(`Invalid ${label}.`);
  }

  return parsed;
}

function formatLeaveDate(d: Date): string {
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
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
 * Phase 1.8: a range that overlaps one of this teacher's own PENDING
 * or APPROVED leaves is refused. Phase 1.6: a leave starting in under
 * 24 hours is allowed, and Admin is told it is an emergency.
 */
export async function createLeaveRequest(input: CreateLeaveRequestInput) {
  const reason = input.reason?.trim() ?? "";

  if (!reason) {
    throw new LeaveRequestError("A reason is required.");
  }

  if (reason.length > MAX_REASON_LENGTH) {
    throw new LeaveRequestError(`Reason must be ${MAX_REASON_LENGTH} characters or fewer.`);
  }

  const start = parseLeaveDate(input.startDate, "start date");
  const end = parseLeaveDate(input.endDate, "end date");

  if (compareDates(start, todayInPlatformTz()) < 0) {
    throw new LeaveRequestError("Start date can't be in the past.");
  }

  if (compareDates(end, start) < 0) {
    throw new LeaveRequestError("End date can't be before the start date.");
  }

  const startDate = calendarDateToDate(start);
  const endDate = calendarDateToDate(end);

  const overlapping = await prisma.leaveRequest.findFirst({
    where: {
      teacherId: input.teacherId,
      status: { in: [LeaveRequestStatus.PENDING, LeaveRequestStatus.APPROVED] },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
    select: { startDate: true, endDate: true, status: true },
  });

  if (overlapping) {
    throw new LeaveRequestError(
      `These dates overlap your ${overlapping.status === LeaveRequestStatus.APPROVED ? "approved" : "pending"} leave (${formatLeaveDate(
        overlapping.startDate,
      )} to ${formatLeaveDate(overlapping.endDate)}). Withdraw it first or choose other dates.`,
      409,
    );
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

  await notifyLeaveRequestSubmitted(
    input.teacherId,
    isEmergencyLeave(created.startDate, created.createdAt),
  );

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

/**
 * Every leave request across every Teacher, newest first — Admin's
 * full view (pending + resolved). Each row carries `isEmergency`
 * (Phase 1.6) and, for PENDING rows, `impact` (Phase 1.7): how many
 * classes would move, be cancelled for lack of a slot, or be left
 * alone for being under 4 hours away. `impact` is null when it could
 * not be worked out — the approval itself never depends on it.
 */
export async function listLeaveRequestsForAdmin() {
  const rows = await prisma.leaveRequest.findMany({
    include: { teacher: { select: teacherSelect } },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();

  // One at a time: each preview takes cycle locks, so running them
  // together could make them wait on each other.
  const result = [];

  for (const row of rows) {
    let impact: LeaveImpact | null = null;

    if (row.status === LeaveRequestStatus.PENDING) {
      try {
        impact = await previewLeaveImpact(row, now);
      } catch (err) {
        console.error(`Leave impact preview failed for ${row.id}:`, err);
      }
    }

    result.push({
      ...row,
      isEmergency: isEmergencyLeave(row.startDate, row.createdAt),
      impact,
    });
  }

  return result;
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
