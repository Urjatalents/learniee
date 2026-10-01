"use client";

import { use } from "react";

import { useChatRooms } from "@/features/chat/hooks/useChatRooms";
import { useChatMessages } from "@/features/chat/hooks/useChatMessages";
import { displayName } from "@/features/chat/types/chat";
import ChatWindow from "@/features/chat/components/ChatWindow";
import { SENDABLE_ENROLLMENT_STATUSES } from "@/features/shared/utils/enrollmentStatus";


export default function ParentChatRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);

  // Reuses the same polling room list as the index page purely for
  // this room's header info (teacher name, course, status) — an
  // extra "get one room" endpoint wasn't worth adding for that.
  const { rooms } = useChatRooms("/api/parent/chat");
  const room = rooms.find((r) => r.id === roomId);

  const { messages, loading, error, sending, sendMessage, reportMessage } = useChatMessages(
    `/api/parent/chat/${roomId}/messages`,
    true,
  );

  const canSend = !room || SENDABLE_ENROLLMENT_STATUSES.has(room.enrollment.status);

  return (
    <ChatWindow
      headerTitle={room ? displayName(room.teacher) : "Conversation"}
      headerSubtitle={room ? room.course.courseTitle ?? undefined : undefined}
      backPath="/parent/chat"
      messages={messages}
      loading={loading}
      error={error}
      sending={sending}
      viewerSenderRole="PARENT"
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
