import {
    createNotification,
    notifyAllAdmins
} from "@/features/shared/server/notification.service";
import { prisma } from "@/lib/prisma";
import "server-only";
import { R, T, displayName, safe } from './shared';

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export function notifyChatMessage(roomId: string, senderRole: "PARENT" | "TEACHER") {
  return safe("chat message", async () => {
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: {
        parentId: true,
        teacherId: true,
        parent: { select: { firstName: true, lastName: true, visibleName: true } },
        teacher: { select: { firstName: true, lastName: true, visibleName: true } },
        course: { select: { courseTitle: true } },
      },
    });
    if (!room) return;

    const courseTitle = room.course.courseTitle || "your enrollment";

    if (senderRole === "PARENT") {
      await createNotification({
        recipientId: room.teacherId,
        recipientRole: R.TEACHER,
        type: T.CHAT_MESSAGE,
        title: "New message",
        message: `${displayName(room.parent)} sent you a message about "${courseTitle}".`,
        link: `/teacher/chat/${roomId}`,
      });
    } else {
      await createNotification({
        recipientId: room.parentId,
        recipientRole: R.PARENT,
        type: T.CHAT_MESSAGE,
        title: "New message",
        message: `${displayName(room.teacher)} sent you a message about "${courseTitle}".`,
        link: `/parent/chat/${roomId}`,
      });
    }
  });
}
/**
 * A Parent or Teacher message contained something shaped like a phone
 * number (`06` #31) — the number itself was already masked out of
 * `body` before it was saved (see chat.service.ts's `sendMessage`),
 * so this is Admin-only: the sender and recipient never learn a
 * notification was even sent. Every Admin gets it, same fan-out as
 * every other Admin action-queue notification.
 */
export function notifyAdminChatPhoneNumberFlagged(
  roomId: string,
  senderRole: "PARENT" | "TEACHER",
) {
  return safe("chat phone number flagged", async () => {
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: {
        parent: { select: { firstName: true, lastName: true, visibleName: true } },
        teacher: { select: { firstName: true, lastName: true, visibleName: true } },
        course: { select: { courseTitle: true } },
      },
    });
    if (!room) return;

    const courseTitle = room.course.courseTitle || "an enrollment";
    const senderName =
      senderRole === "PARENT" ? displayName(room.parent) : displayName(room.teacher);

    await notifyAllAdmins({
      type: T.CHAT_PHONE_NUMBER_FLAGGED,
      title: "Possible phone number shared in chat",
      message: `${senderName} (${senderRole.toLowerCase()}) may have shared a phone number in the chat for "${courseTitle}". It was hidden from the other party — review the conversation.`,
      link: `/admin/chat/${roomId}`,
    });
  });
}
/**
 * A Parent/Teacher reported a chat message. Admin-only — the person
 * being reported is never told. Links to the report queue.
 */
export function notifyAdminChatMessageReported(
  roomId: string,
  reporterRole: "PARENT" | "TEACHER",
) {
  return safe("chat message reported", async () => {
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: {
        parent: { select: { firstName: true, lastName: true, visibleName: true } },
        teacher: { select: { firstName: true, lastName: true, visibleName: true } },
        course: { select: { courseTitle: true } },
      },
    });
    if (!room) return;

    const courseTitle = room.course.courseTitle || "an enrollment";
    const reporterName =
      reporterRole === "PARENT" ? displayName(room.parent) : displayName(room.teacher);

    await notifyAllAdmins({
      type: T.CHAT_MESSAGE_REPORTED,
      title: "Chat message reported",
      message: `${reporterName} (${reporterRole.toLowerCase()}) reported a message in the chat for "${courseTitle}".`,
      link: "/admin/chat-reports",
    });
  });
}
