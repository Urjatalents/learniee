import {
  ActivityAction,
  ActivityActorRole,
  ChatReportStatus,
  ChatSenderRole,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { ChatError, getRoomForAccess } from "@/features/chat/server/chat.service";
import { displayName } from "@/features/chat/types/chat";
import { notifyAdminChatMessageReported } from "@/features/shared/server/notificationTriggers.service";
import { logActivity } from "@/features/shared/server/activityLog.service";

const MAX_REASON_LENGTH = 500;
const ADMIN_LIST_LIMIT = 200;

export interface ReportChatMessageInput {
  roomId: string;
  messageId: string;
  reporterRole: "PARENT" | "TEACHER";
  reporterId: string;
  reason?: string;
}

/**
 * A Parent or Teacher reports a message the OTHER party sent in their
 * own room. Allowed even after the enrollment ended — reporting is a
 * safety action, unlike sending. One report per (message, reporter).
 */
export async function reportChatMessage(input: ReportChatMessageInput) {
  const reason = input.reason?.trim() || null;

  if (reason && reason.length > MAX_REASON_LENGTH) {
    throw new ChatError(`Reason is too long (${MAX_REASON_LENGTH} characters max).`);
  }

  // Ownership check: 404 for a missing room, 403 for someone else's.
  await getRoomForAccess(input.roomId, { role: input.reporterRole, actorId: input.reporterId });

  const message = await prisma.chatMessage.findFirst({
    where: { id: input.messageId, chatRoomId: input.roomId },
    select: { id: true, senderRole: true },
  });

  if (!message) {
    throw new ChatError("Message not found.", 404);
  }

  if (message.senderRole === input.reporterRole) {
    throw new ChatError("You can only report messages sent by the other person.");
  }

  let report: { id: string };

  try {
    report = await prisma.chatMessageReport.create({
      data: {
        chatMessageId: message.id,
        chatRoomId: input.roomId,
        reporterRole: input.reporterRole as ChatSenderRole,
        reporterId: input.reporterId,
        reason,
      },
      select: { id: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ChatError("You've already reported this message.", 409);
    }
    throw error;
  }

  await notifyAdminChatMessageReported(input.roomId, input.reporterRole);

  await logActivity({
    action: ActivityAction.CHAT_MESSAGE_REPORTED,
    actorRole:
      input.reporterRole === "PARENT" ? ActivityActorRole.PARENT : ActivityActorRole.TEACHER,
    actorId: input.reporterId,
    description: `A chat message was reported in chat room ${input.roomId}.`,
    metadata: { chatRoomId: input.roomId, chatMessageId: message.id, reportId: report.id },
  });

  return report;
}

/**
 * Admin's report queue: open reports first, then reviewed ones, newest
 * first inside each. Includes the unmasked text of a phone-flagged
 * message (Admin-only, same as the Chat Monitor).
 */
export async function listChatReports() {
  const [rows, openCount] = await Promise.all([
    prisma.chatMessageReport.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: ADMIN_LIST_LIMIT,
      select: {
        id: true,
        status: true,
        reason: true,
        reporterRole: true,
        createdAt: true,
        reviewedAt: true,
        chatRoomId: true,
        chatMessage: {
          select: {
            senderRole: true,
            body: true,
            originalBody: true,
            containsPhoneNumber: true,
            createdAt: true,
          },
        },
        chatRoom: {
          select: {
            parent: { select: { id: true, firstName: true, lastName: true, visibleName: true } },
            teacher: { select: { id: true, firstName: true, lastName: true, visibleName: true } },
            course: { select: { courseTitle: true } },
          },
        },
      },
    }),
    prisma.chatMessageReport.count({ where: { status: ChatReportStatus.OPEN } }),
  ]);

  const reports = rows.map((row) => {
    const { parent, teacher, course } = row.chatRoom;

    return {
      id: row.id,
      status: row.status,
      reason: row.reason,
      createdAt: row.createdAt,
      reviewedAt: row.reviewedAt,
      chatRoomId: row.chatRoomId,
      courseTitle: course.courseTitle,
      reporterRole: row.reporterRole,
      reporterName: row.reporterRole === "PARENT" ? displayName(parent) : displayName(teacher),
      message: {
        senderRole: row.chatMessage.senderRole,
        senderName:
          row.chatMessage.senderRole === "PARENT" ? displayName(parent) : displayName(teacher),
        body: row.chatMessage.body,
        originalBody: row.chatMessage.containsPhoneNumber ? row.chatMessage.originalBody : null,
        createdAt: row.chatMessage.createdAt,
      },
    };
  });

  return { reports, openCount };
}

/** Admin marks a report as looked at. Idempotent. */
export async function markChatReportReviewed(reportId: string, adminSub: string) {
  const report = await prisma.chatMessageReport.findUnique({
    where: { id: reportId },
    select: { id: true, status: true },
  });

  if (!report) {
    throw new ChatError("Report not found.", 404);
  }

  if (report.status === ChatReportStatus.REVIEWED) {
    return;
  }

  await prisma.chatMessageReport.updateMany({
    where: { id: reportId, status: ChatReportStatus.OPEN },
    data: { status: ChatReportStatus.REVIEWED, reviewedAt: new Date(), reviewedBySub: adminSub },
  });
}
