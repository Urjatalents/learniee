"use client";

import { use } from "react";

import { useChatRooms } from "@/features/chat/hooks/useChatRooms";
import { useChatMessages } from "@/features/chat/hooks/useChatMessages";
import { displayName } from "@/features/chat/types/chat";
import ChatWindow from "@/features/chat/components/ChatWindow";

export default function AdminChatRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);

  const { rooms } = useChatRooms("/api/admin/chat");
  const room = rooms.find((r) => r.id === roomId);

  // canSend=false: this hook's sendMessage becomes a no-op, and
  // there's no POST handler on /api/admin/chat/[roomId]/messages
  // anyway — Admin is view-only here by design.
  const { messages, loading, error } = useChatMessages(
    `/api/admin/chat/${roomId}/messages`,
    false,
  );

  return (
    <ChatWindow
      headerTitle={
        room ? `${displayName(room.parent)} ↔ ${displayName(room.teacher)}` : "Conversation"
      }
      headerSubtitle={
        room
          ? `${room.course.courseTitle ?? "Untitled course"} · ${displayName(room.student)}`
          : undefined
      }
      backPath="/admin/chat"
      pageHeightClass="h-[calc(100vh-11rem)] min-h-[420px] overflow-hidden rounded-[18px] border border-admin-line"
      messages={messages}
      loading={loading}
      error={error}
      sending={false}
      viewerSenderRole={null}
      canSend={false}
      onSend={() => {}}
      disabledReason="Admin view is read-only — messages can only be sent by the parent or teacher."
    />
  );
}
