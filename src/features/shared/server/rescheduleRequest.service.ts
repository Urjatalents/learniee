import "server-only";

import { prisma } from "@/lib/prisma";
import {
  ClassSessionStatus,
  RescheduleRequestedBy,
  RescheduleRequestStatus,
} from "@prisma/client";
import {
  notifyReschedulePropose,
  notifyRescheduleResponded,
} from "@/features/shared/server/notificationTriggers.service";
import { isValidTimeOfDay, platformWallClockToUtc } from "@/lib/platformTime";

/**
 * Reschedule requests for one already-scheduled `ClassSession` — see
 * the `RescheduleRequest` model's doc-comment in `schema.prisma` for
 * the full picture. Single-step approval, independent of
 * Enrollment's own dual-approval workflow:
 *
 *   Parent proposes  -> PENDING_TEACHER_APPROVAL -> Teacher approves/rejects
 *   Teacher proposes -> PENDING_PARENT_APPROVAL  -> Parent approves/rejects
 *
 * Approving moves the underlying ClassSession's own
 * scheduledDate/scheduledTime — there's no separate "old"/"new"
 * session row, the same row just moves. The requester can also
 * withdraw a still-pending request before the other side responds.
 */

export class RescheduleRequestError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

type ActorRole = "TEACHER" | "PARENT";

const PENDING_STATUSES: RescheduleRequestStatus[] = [
  RescheduleRequestStatus.PENDING_TEACHER_APPROVAL,
  RescheduleRequestStatus.PENDING_PARENT_APPROVAL,
];

/** Same "date-only, local midnight" convention ClassSession.scheduledDate uses. */
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseDateOnly(value: string): Date {
  // Accepts "YYYY-MM-DD" (a plain <input type="date"> value) as well
  // as a full ISO string — either way we only keep the calendar date,
  // same as classSession.service.ts's own startOfDay() usage.
  const parsed = new Date(value.length <= 10 ? `${value}T00:00:00` : value);

  if (Number.isNaN(parsed.getTime())) {
    throw new RescheduleRequestError("Invalid proposed date.");
  }

  return startOfDay(parsed);
}

function assertValidTime(time?: string | null) {
  if (time == null || time === "") return null;

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new RescheduleRequestError('Proposed time must be in "HH:mm" format.');
  }

  return time;
}

const requestInclude = {
  classSession: {
    select: { id: true, scheduledDate: true, scheduledTime: true, status: true },
  },
  enrollment: {
    select: {
      id: true,
      subject: true,
      course: { select: { id: true, courseTitle: true } },
    },
  },
  teacher: {
    select: { id: true, firstName: true, lastName: true, visibleName: true },
  },
  parent: {
    select: { id: true, firstName: true, lastName: true, visibleName: true },
  },
} as const;

/**
 * Loads the target ClassSession and checks it belongs to the actor
 * and is still SCHEDULED (a completed/cancelled class can't be
 * rescheduled — reschedule an upcoming one, or if it's already
 * cancelled/done there's nothing to move).
 */
async function loadReschedulableSession(sessionId: string, actorRole: ActorRole, actorId: string) {
  const session = await prisma.classSession.findFirst({
    where:
      actorRole === "TEACHER"
        ? { id: sessionId, teacherId: actorId }
        : { id: sessionId, parentId: actorId },
  });

  if (!session) {
    throw new RescheduleRequestError(
      "Class session not found, or doesn't belong to you.",
      404,
    );
  }

  if (session.status !== ClassSessionStatus.SCHEDULED) {
    throw new RescheduleRequestError(
      `This class is already marked ${session.status.toLowerCase()} and can't be rescheduled.`,
      409,
    );
  }

  return session;
}

export interface ProposeRescheduleInput {
  sessionId: string;
  actorRole: ActorRole;
  actorId: string; // teacherId or parentId, matching actorRole
  proposedDate: string;
  proposedTime?: string | null;
  reason?: string | null;
}

/**
 * Either party proposes moving a SCHEDULED class to a new
 * date/time. Only one pending request per session at a time — a
 * second proposal before the first is resolved is rejected outright
 * rather than silently superseding it, so the other side never has
 * two conflicting asks to juggle.
 */
export async function proposeReschedule(input: ProposeRescheduleInput) {
  const session = await loadReschedulableSession(
    input.sessionId,
    input.actorRole,
    input.actorId,
  );

  const existingPending = await prisma.rescheduleRequest.findFirst({
    where: { classSessionId: session.id, status: { in: PENDING_STATUSES } },
  });

  if (existingPending) {
    throw new RescheduleRequestError(
      "This class already has a pending reschedule request awaiting a response.",
      409,
    );
  }

  const proposedDate = parseDateOnly(input.proposedDate);
  const proposedTime = assertValidTime(input.proposedTime);

  const today = startOfDay(new Date());
  if (proposedDate < today) {
    throw new RescheduleRequestError("Proposed date can't be in the past.");
  }

  const requestedBy: RescheduleRequestedBy =
    input.actorRole === "PARENT" ? RescheduleRequestedBy.PARENT : RescheduleRequestedBy.TEACHER;

  const status: RescheduleRequestStatus =
    requestedBy === RescheduleRequestedBy.PARENT
      ? RescheduleRequestStatus.PENDING_TEACHER_APPROVAL
      : RescheduleRequestStatus.PENDING_PARENT_APPROVAL;

  const reason = input.reason?.trim() || null;

  const created = await prisma.rescheduleRequest.create({
    data: {
      classSessionId: session.id,
      enrollmentId: session.enrollmentId,
      teacherId: session.teacherId,
      parentId: session.parentId,
      requestedBy,
      originalScheduledDate: session.scheduledDate,
      originalScheduledTime: session.scheduledTime,
      proposedDate,
      proposedTime,
      reason,
      status,
    },
    include: requestInclude,
  });

  await notifyReschedulePropose(created.id);

  return created;
}

function assertCanRespond(
  request: { teacherId: string; parentId: string; status: RescheduleRequestStatus },
  actorRole: ActorRole,
  actorId: string,
) {
  const ownedByActor =
    actorRole === "TEACHER" ? request.teacherId === actorId : request.parentId === actorId;

  if (!ownedByActor) {
    throw new RescheduleRequestError(
      "Reschedule request not found, or doesn't belong to you.",
      404,
    );
  }

  const expectedStatus =
    actorRole === "TEACHER"
      ? RescheduleRequestStatus.PENDING_TEACHER_APPROVAL
      : RescheduleRequestStatus.PENDING_PARENT_APPROVAL;

  if (request.status !== expectedStatus) {
    throw new RescheduleRequestError(
      "This request isn't waiting on your response anymore.",
      409,
    );
  }
}

export interface RespondToRescheduleInput {
  requestId: string;
  actorRole: ActorRole;
  actorId: string;
  decision: "APPROVE" | "REJECT";
  responseNote?: string | null;
}

/**
 * The non-proposing party approves or rejects a pending request.
 * Approving moves the underlying ClassSession's own date/time —
 * re-checked for a conflicting session on the target date at this
 * point too (not just at proposal time), since the schedule could
 * have changed in between.
 */
export async function respondToReschedule(input: RespondToRescheduleInput) {
  const request = await prisma.rescheduleRequest.findUnique({
    where: { id: input.requestId },
  });

  if (!request) {
    throw new RescheduleRequestError("Reschedule request not found.", 404);
  }

  assertCanRespond(request, input.actorRole, input.actorId);

  const responseNote = input.responseNote?.trim() || null;

  if (input.decision === "REJECT") {
    const rejected = await prisma.rescheduleRequest.update({
      where: { id: request.id },
      data: {
        status: RescheduleRequestStatus.REJECTED,
        responseNote,
        respondedAt: new Date(),
      },
      include: requestInclude,
    });

    await notifyRescheduleResponded(rejected.id, false);

    return rejected;
  }

  // APPROVE
  const session = await prisma.classSession.findUnique({
    where: { id: request.classSessionId },
  });

  if (!session || session.status !== ClassSessionStatus.SCHEDULED) {
    throw new RescheduleRequestError(
      "This class is no longer scheduled — nothing to reschedule.",
      409,
    );
  }

  const conflict = await prisma.classSession.findFirst({
    where: {
      enrollmentId: request.enrollmentId,
      scheduledDate: request.proposedDate,
      id: { not: session.id },
    },
  });

  if (conflict) {
    throw new RescheduleRequestError(
      "Another class is already scheduled for this enrollment on that date.",
      409,
    );
  }

  const moved: {
    scheduledDate: Date;
    scheduledTime: string | null;
    startsAt?: Date;
    endsAt?: Date;
  } = {
    scheduledDate: request.proposedDate,
    scheduledTime: request.proposedTime,
  };

  // Cycle-model sessions (Part 1A) also carry real start/end
  // instants — keep them in step with the moved date/time. A
  // proposal without a time keeps the session's current one, since
  // a cycle-model session always has a start time.
  if (session.startsAt && session.lengthMinutes) {
    const time = request.proposedTime ?? session.scheduledTime;

    if (isValidTimeOfDay(time)) {
      // `proposedDate` is written by this file's own startOfDay()
      // (local getters), so it's read back the same way.
      const startsAt = platformWallClockToUtc(
        {
          year: request.proposedDate.getFullYear(),
          month: request.proposedDate.getMonth() + 1,
          day: request.proposedDate.getDate(),
        },
        time,
      );

      moved.scheduledTime = time;
      moved.startsAt = startsAt;
      moved.endsAt = new Date(
        startsAt.getTime() + session.lengthMinutes * 60_000,
      );
    }
  }

  const [, updatedRequest] = await prisma.$transaction([
    prisma.classSession.update({
      where: { id: session.id },
      data: moved,
    }),
    prisma.rescheduleRequest.update({
      where: { id: request.id },
      data: {
        status: RescheduleRequestStatus.APPROVED,
        responseNote,
        respondedAt: new Date(),
      },
      include: requestInclude,
    }),
  ]);

  await notifyRescheduleResponded(updatedRequest.id, true);

  return updatedRequest;
}

export interface CancelRescheduleInput {
  requestId: string;
  actorRole: ActorRole;
  actorId: string;
}

/** The original proposer withdraws their own still-pending request. */
export async function cancelRescheduleRequest(input: CancelRescheduleInput) {
  const request = await prisma.rescheduleRequest.findUnique({
    where: { id: input.requestId },
  });

  if (!request) {
    throw new RescheduleRequestError("Reschedule request not found.", 404);
  }

  const proposedByActor =
    input.actorRole === "TEACHER"
      ? request.requestedBy === RescheduleRequestedBy.TEACHER && request.teacherId === input.actorId
      : request.requestedBy === RescheduleRequestedBy.PARENT && request.parentId === input.actorId;

  if (!proposedByActor) {
    throw new RescheduleRequestError(
      "Reschedule request not found, or doesn't belong to you.",
      404,
    );
  }

  if (!PENDING_STATUSES.includes(request.status)) {
    throw new RescheduleRequestError(
      "This request has already been responded to and can't be withdrawn.",
      409,
    );
  }

  return prisma.rescheduleRequest.update({
    where: { id: request.id },
    data: { status: RescheduleRequestStatus.CANCELLED, respondedAt: new Date() },
    include: requestInclude,
  });
}

/** Every reschedule request involving this Teacher — awaiting their response, or raised by/resolved for them. */
export function listRescheduleRequestsForTeacher(teacherId: string) {
  return prisma.rescheduleRequest.findMany({
    where: { teacherId },
    include: requestInclude,
    orderBy: { createdAt: "desc" },
  });
}

/** Every reschedule request involving this Parent. */
export function listRescheduleRequestsForParent(parentId: string) {
  return prisma.rescheduleRequest.findMany({
    where: { parentId },
    include: requestInclude,
    orderBy: { createdAt: "desc" },
  });
}
