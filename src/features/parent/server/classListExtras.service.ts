import "server-only";

import { prisma } from "@/lib/prisma";
import type { ChatPreview } from "@/features/parent/types/classList";

/**
 * Small read-only extras for the Parent "My Classes" page: how much
 * homework is still open per enrollment, and the last message of each
 * chat room. Both are scoped by the parent's own id in the `where`
 * clause — a parent can only ever see their own rows.
 */

/** enrollmentId -> number of homework items with no submission yet. */
export async function getOpenHomeworkCounts(parentId: string): Promise<Record<string, number>> {
  const groups = await prisma.homework.groupBy({
    by: ["enrollmentId"],
    // Role scope: only this parent's homework.
    where: { parentId, submission: { is: null } },
    _count: { _all: true },
  });

  return Object.fromEntries(groups.map((g) => [g.enrollmentId, g._count._all]));
}

/** The newest message of every chat room the parent is part of. */
export async function getChatPreviewsForParent(parentId: string): Promise<ChatPreview[]> {
  const rows = await prisma.chatMessage.findMany({
    // Role scope: only rooms this parent belongs to.
    where: { chatRoom: { parentId } },
    distinct: ["chatRoomId"],
    orderBy: [{ chatRoomId: "asc" }, { createdAt: "desc" }],
    select: { chatRoomId: true, body: true, senderRole: true, createdAt: true },
  });

  return rows.map((r) => ({
    chatRoomId: r.chatRoomId,
    body: r.body,
    senderRole: r.senderRole,
    createdAt: r.createdAt.toISOString(),
  }));
}
