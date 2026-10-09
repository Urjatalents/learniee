import { prisma } from "@/lib/prisma";
import {
    RescheduleRequestedBy,
    RescheduleRequestStatus
} from "@prisma/client";
import "server-only";
import { ActorRole, PENDING_STATUSES, requestInclude, RescheduleRequestError } from './base';
import { expireStaleRescheduleRequestsQuietly } from './close';

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
export async function listRescheduleRequestsForTeacher(teacherId: string) {
  // Phase 1.3: read-time trigger for closing unanswered requests.
  await expireStaleRescheduleRequestsQuietly({ teacherId });

  return prisma.rescheduleRequest.findMany({
    where: { teacherId },
    include: requestInclude,
    orderBy: { createdAt: "desc" },
  });
}
/** Every reschedule request involving this Parent. */
export async function listRescheduleRequestsForParent(parentId: string) {
  await expireStaleRescheduleRequestsQuietly({ parentId });

  return prisma.rescheduleRequest.findMany({
    where: { parentId },
    include: requestInclude,
    orderBy: { createdAt: "desc" },
  });
}
