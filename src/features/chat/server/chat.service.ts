import { prisma } from "@/lib/prisma";
import { ActivityAction, ActivityActorRole, ChatSenderRole } from "@prisma/client";
import { SENDABLE_ENROLLMENT_STATUSES } from "@/features/shared/utils/enrollmentStatus";
import {
  notifyAdminChatPhoneNumberFlagged,
  notifyChatMessage,
} from "@/features/shared/server/notificationTriggers.service";
import { logActivity } from "@/features/shared/server/activityLog.service";
import { maskPhoneNumbers } from "@/features/chat/utils/phoneDetection";

export class ChatError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Enrollment statuses that still allow new messages. A rejected or
 * cancelled enrollment keeps its ChatRoom (and message history) around
 * for Admin's record, but Parent/Teacher can no longer send into it —
 * see the gating note on the ChatRoom model in schema.prisma. Shared
 * with the dual-approval workflow's status list so this never drifts
 * out of sync with what states actually exist.
 */

const roomListSelect = {
  id: true,
  lastMessageAt: true,
  createdAt: true,
  parent: {
    select: { id: true, firstName: true, lastName: true, visibleName: true },
  },
  teacher: {
    select: { id: true, firstName: true, lastName: true, visibleName: true },
  },
  student: {
    select: { id: true, firstName: true, lastName: true, visibleName: true },
  },
  course: {
    select: { id: true, courseTitle: true, subject: true },
  },
  enrollment: {
    select: { id: true, status: true, isLegacy: true },
  },
  _count: {
    select: { messages: true },
  },
} as const;

/** Every chat room a Parent is party to, most recently active first. */
export function getChatRoomsForParent(parentId: string) {
  return prisma.chatRoom.findMany({
    where: { parentId },
    select: roomListSelect,
    orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
  });
}

/**
 * Every chat room a Teacher is party to — naturally one per child
 * they teach (each room maps 1:1 to an Enrollment), matching the "a
 * separate room per child" requirement.
 */
export function getChatRoomsForTeacher(teacherId: string) {
  return prisma.chatRoom.findMany({
    where: { teacherId },
    select: roomListSelect,
    orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
  });
}

export interface AdminChatFilters {
  teacherId?: string;
  parentId?: string;
  courseId?: string;
}

/**
 * Every chat room on the platform, optionally narrowed by
 * teacher/parent/course — Admin's "view any conversation" queue.
 * Deliberately unrestricted otherwise: Admin oversight of Parent<->
 * Teacher messaging is the whole point of this endpoint.
 *
 * Also marks `hasFlaggedMessages` (06 #31) so the Admin list/search
 * can surface rooms with a possible phone-number share without
 * opening each one. Done as a second query rather than a Prisma
 * filtered relation count so `roomListSelect` stays shared with the
 * Parent/Teacher listings, which have no reason to know about flags.
 */
export async function getChatRoomsForAdmin(filters: AdminChatFilters = {}) {
  const rooms = await prisma.chatRoom.findMany({
    where: {
      teacherId: filters.teacherId || undefined,
      parentId: filters.parentId || undefined,
      courseId: filters.courseId || undefined,
    },
    select: roomListSelect,
    orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
  });

  if (rooms.length === 0) {
    return [] as Array<(typeof rooms)[number] & { hasFlaggedMessages: boolean }>;
  }

  const flagged = await prisma.chatMessage.findMany({
    where: { chatRoomId: { in: rooms.map((room) => room.id) }, containsPhoneNumber: true },
    select: { chatRoomId: true },
    distinct: ["chatRoomId"],
  });
  const flaggedRoomIds = new Set(flagged.map((row) => row.chatRoomId));

  return rooms.map((room) => ({
    ...room,
    hasFlaggedMessages: flaggedRoomIds.has(room.id),
  }));
}

type RoomAccess =
  | { role: "PARENT"; actorId: string }
  | { role: "TEACHER"; actorId: string }
  | { role: "ADMIN" };

/**
 * Loads a room and checks the requester is actually allowed to see
 * it: the room's own parent, the room's own teacher, or an Admin.
 * Throws ChatError(404) if the room doesn't exist, or (403) if it
 * exists but isn't this requester's.
 */
export async function getRoomForAccess(roomId: string, access: RoomAccess) {
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    include: { enrollment: { select: { status: true } } },
  });

  if (!room) {
    throw new ChatError("Chat room not found.", 404);
  }

  if (access.role === "PARENT" && room.parentId !== access.actorId) {
    throw new ChatError("This chat room doesn't belong to your account.", 403);
  }

  if (access.role === "TEACHER" && room.teacherId !== access.actorId) {
    throw new ChatError("This chat room doesn't belong to your account.", 403);
  }

  // ADMIN falls through with no ownership check by design.

  return room;
}

const baseMessageSelect = {
  id: true,
  chatRoomId: true,
  senderRole: true,
  senderId: true,
  body: true,
  createdAt: true,
  containsPhoneNumber: true,
} as const;

/**
 * Messages in a room, oldest first. `after` supports simple
 * polling — pass the timestamp of the last message you already have
 * and only newer ones come back (see useChatMessages.ts).
 *
 * `includeOriginal` (06 #31) additionally selects `originalBody` —
 * the unmasked text for a phone-number-flagged message. Only the
 * Admin messages route passes this; Parent/Teacher never receive the
 * real number, so the field is left off their query entirely rather
 * than fetched-then-hidden.
 */
export function listMessages(
  roomId: string,
  after?: Date,
  options: { includeOriginal?: boolean } = {},
) {
  return prisma.chatMessage.findMany({
    where: {
      chatRoomId: roomId,
      createdAt: after ? { gt: after } : undefined,
    },
    orderBy: { createdAt: "asc" },
    select: options.includeOriginal
      ? { ...baseMessageSelect, originalBody: true }
      : baseMessageSelect,
  });
}

export interface SendMessageInput {
  roomId: string;
  senderRole: "PARENT" | "TEACHER";
  senderId: string;
  body: string;
}

/**
 * Sends a message into a room. Only PARENT/TEACHER can send — Admin's
 * access is view-only by design (see chat routes), so there's no
 * ADMIN case here at all rather than a role check that could be
 * loosened by accident later.
 */
export async function sendMessage(input: SendMessageInput) {
  const body = input.body.trim();

  if (!body) {
    throw new ChatError("Message can't be empty.");
  }

  if (body.length > 4000) {
    throw new ChatError("Message is too long (4000 characters max).");
  }

  const room = await prisma.chatRoom.findUnique({
    where: { id: input.roomId },
    include: { enrollment: { select: { status: true } } },
  });

  if (!room) {
    throw new ChatError("Chat room not found.", 404);
  }

  const ownerId = input.senderRole === "PARENT" ? room.parentId : room.teacherId;
  const actorId = input.senderId;

  if (ownerId !== actorId) {
    throw new ChatError("This chat room doesn't belong to your account.", 403);
  }

  if (!SENDABLE_ENROLLMENT_STATUSES.has(room.enrollment.status)) {
    throw new ChatError(
      "This enrollment was rejected or cancelled — you can no longer send messages here.",
      409,
    );
  }

  // Phone-number flagging (06 #31): mask anything phone-shaped out of
  // what gets saved as `body` (what everyone but Admin ever reads),
  // and keep the real text in `originalBody` for Admin's moderation
  // view only. The sender and recipient are never told this happened
  // beyond the placeholder text itself — no separate warning, no
  // notification to either of them.
  const { masked, found } = maskPhoneNumbers(body);

  const [message] = await prisma.$transaction([
    prisma.chatMessage.create({
      data: {
        chatRoomId: input.roomId,
        senderRole: input.senderRole as ChatSenderRole,
        senderId: input.senderId,
        body: found ? masked : body,
        containsPhoneNumber: found,
        originalBody: found ? body : null,
      },
      select: baseMessageSelect,
    }),
    prisma.chatRoom.update({
      where: { id: input.roomId },
      data: { lastMessageAt: new Date() },
    }),
  ]);

  await notifyChatMessage(input.roomId, input.senderRole);

  if (found) {
    await notifyAdminChatPhoneNumberFlagged(input.roomId, input.senderRole);

    await logActivity({
      action: ActivityAction.CHAT_PHONE_NUMBER_FLAGGED,
      actorRole:
        input.senderRole === "PARENT" ? ActivityActorRole.PARENT : ActivityActorRole.TEACHER,
      actorId: input.senderId,
      description: `Possible phone number shared and masked in chat room ${input.roomId}.`,
      metadata: { chatRoomId: input.roomId, chatMessageId: message.id },
    });
  }

  return message;
}
