"use client";

import { use } from "react";

import { useChatRooms } from "@/features/chat/hooks/useChatRooms";
import { useChatMessages } from "@/features/chat/hooks/useChatMessages";
import { displayName } from "@/features/chat/types/chat";
import ChatWindow from "@/features/chat/components/ChatWindow";
import { SENDABLE_ENROLLMENT_STATUSES } from "@/features/shared/utils/enrollmentStatus";


export default function TeacherChatRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);

  const { rooms } = useChatRooms("/api/teacher/chat");
  const room = rooms.find((r) => r.id === roomId);

  const { messages, loading, error, sending, sendMessage, reportMessage } = useChatMessages(
    `/api/teacher/chat/${roomId}/messages`,
    true,
  );

  const canSend = !room || SENDABLE_ENROLLMENT_STATUSES.has(room.enrollment.status);

  return (
    <ChatWindow
      headerTitle={room ? displayName(room.parent) : "Conversation"}
      headerSubtitle={
        room
          ? `${room.course.courseTitle ?? "Untitled course"} · ${displayName(room.student)}`
          : undefined
      }
      backPath="/teacher/chat"
      messages={messages}
      loading={loading}
      error={error}
      sending={sending}
      viewerSenderRole="TEACHER"
      canSend={canSend}
      onSend={sendMessage}
      onReport={reportMessage}
      disabledReason={
        canSend
          ? undefined
          : "This enrollment was rejected or cancelled, so messaging is closed."
      }
    />
  );
}
