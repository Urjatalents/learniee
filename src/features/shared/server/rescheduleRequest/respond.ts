import {
    notifyRescheduleResponded
} from "@/features/shared/server/notificationTriggers.service";
import {
    dateToCalendarDate,
    isValidTimeOfDay,
    platformWallClockToUtc
} from "@/lib/platformTime";
import { prisma } from "@/lib/prisma";
import {
    ClassSessionStatus,
    RescheduleRequestStatus
} from "@prisma/client";
import "server-only";
import { expireStaleRescheduleRequests } from './close';
import { ActorRole, assertCycleSlotAllowed, assertNotOnTeacherLeave, assertSlotStillFree, isCycleModelSession, requestInclude, RescheduleRequestError } from './base';

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

  // Phase 1.3: a request nobody answered before the class started is
  // closed (original slot kept) rather than answered late.
  const expired = await expireStaleRescheduleRequests(new Date(), { id: request.id });

  if (expired > 0) {
    throw new RescheduleRequestError(
      "This request expired because the class has already started. The original time stands.",
      409,
    );
  }

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

  // Cycle-model sessions: the 4-hour and cycle-deadline rules hold at
  // approval time too, not just when the request was made.
  if (isCycleModelSession(session)) {
    await assertCycleSlotAllowed(
      session,
      dateToCalendarDate(request.proposedDate),
      request.proposedTime,
      new Date(),
    );
  }

  // Phase 1.1 (again at approval): the teacher's leave may have been
  // approved after the request was made.
  await assertNotOnTeacherLeave(session.teacherId, request.proposedDate);

  // Phase 1.5: another class may have taken the slot since the proposal.
  if (isCycleModelSession(session)) {
    const slotTime = request.proposedTime ?? session.scheduledTime;

    if (isValidTimeOfDay(slotTime)) {
      await assertSlotStillFree(session, dateToCalendarDate(request.proposedDate), slotTime);
    }
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
      // Cycle-model proposals store `proposedDate` as UTC midnight of
      // the platform calendar date (`calendarDateToDate`), so it is
      // read back the same way — no dependence on the server's own
      // timezone.
      const startsAt = platformWallClockToUtc(
        dateToCalendarDate(request.proposedDate),
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
