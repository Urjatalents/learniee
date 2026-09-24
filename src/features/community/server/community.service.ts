import { prisma } from "@/lib/prisma";
import { CommunitySenderRole } from "@prisma/client";
import type { CommunityMessage } from "@prisma/client";

import { notifyCommunityAnnouncement } from "@/features/shared/server/notificationTriggers.service";
import {
  COMMUNITY_MAX_MESSAGE_LENGTH,
  type CommunityMessageDto,
} from "@/features/community/types/community";

export class CommunityError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export interface CommunityActor {
  role: CommunitySenderRole;
  id: string;
  name: string;
}

const INITIAL_PAGE_SIZE = 100;
const OLDER_PAGE_SIZE = 50;
const POLL_LIMIT = 200;

function toDto(row: CommunityMessage): CommunityMessageDto {
  const deleted = row.deletedAt !== null;

  return {
    id: row.id,
    senderRole: row.senderRole,
    senderId: row.senderId,
    senderName: row.senderName,
    body: deleted ? "" : row.body,
    isAnnouncement: row.isAnnouncement,
    deleted,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Three read shapes, one endpoint:
 *  - `after`  — polling. Everything created OR changed (deleted) since the
 *    cursor. `>=` on purpose: two writes in the same millisecond can't be
 *    missed; the client de-dupes by id.
 *  - `before` — "load earlier". A page of older messages.
 *  - neither  — first load: the most recent page.
 */
export async function listMessages(params: {
  after: string | null;
  before: string | null;
}): Promise<{ messages: CommunityMessageDto[]; hasMore: boolean }> {
  const after = parseDate(params.after);
  const before = parseDate(params.before);

  if (params.after && !after) {
    throw new CommunityError("Invalid 'after' timestamp.");
  }
  if (params.before && !before) {
    throw new CommunityError("Invalid 'before' timestamp.");
  }

  if (after) {
    const rows = await prisma.communityMessage.findMany({
      where: { updatedAt: { gte: after } },
      orderBy: { updatedAt: "asc" },
      take: POLL_LIMIT,
    });

    const messages = rows.map(toDto).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return { messages, hasMore: false };
  }

  const pageSize = before ? OLDER_PAGE_SIZE : INITIAL_PAGE_SIZE;
  const rows = await prisma.communityMessage.findMany({
    where: before ? { createdAt: { lt: before } } : undefined,
    orderBy: { createdAt: "desc" },
    take: pageSize + 1,
  });

  const hasMore = rows.length > pageSize;
  const messages = rows.slice(0, pageSize).map(toDto).reverse();

  return { messages, hasMore };
}

export async function postMessage(input: {
  actor: CommunityActor;
  body: unknown;
  isAnnouncement: boolean;
}): Promise<CommunityMessageDto> {
  if (typeof input.body !== "string") {
    throw new CommunityError("body is required.");
  }

  const body = input.body.trim();

  if (!body) {
    throw new CommunityError("Message can't be empty.");
  }
  if (body.length > COMMUNITY_MAX_MESSAGE_LENGTH) {
    throw new CommunityError(
      `Message is too long (max ${COMMUNITY_MAX_MESSAGE_LENGTH} characters).`,
    );
  }
  if (input.isAnnouncement && input.actor.role !== CommunitySenderRole.ADMIN) {
    throw new CommunityError("Only Admin can send announcements.", 403);
  }

  const row = await prisma.communityMessage.create({
    data: {
      senderRole: input.actor.role,
      senderId: input.actor.id,
      senderName: input.actor.name,
      body,
      isAnnouncement: input.isAnnouncement,
    },
  });

  if (input.isAnnouncement) {
    // Never throws — a notification failure must not fail the post.
    await notifyCommunityAnnouncement(input.actor.name, body);
  }

  return toDto(row);
}

/** Admin only. Soft delete, safe to repeat. */
export async function deleteMessage(
  messageId: string,
  actor: CommunityActor,
): Promise<CommunityMessageDto> {
  if (actor.role !== CommunitySenderRole.ADMIN) {
    throw new CommunityError("Only Admin can remove messages.", 403);
  }

  const existing = await prisma.communityMessage.findUnique({ where: { id: messageId } });

  if (!existing) {
    throw new CommunityError("Message not found.", 404);
  }
  if (existing.deletedAt) {
    return toDto(existing);
  }

  const row = await prisma.communityMessage.update({
    where: { id: messageId },
    data: { deletedAt: new Date(), deletedByName: actor.name },
  });

  return toDto(row);
}
