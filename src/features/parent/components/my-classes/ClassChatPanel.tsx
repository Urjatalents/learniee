"use client";

import { useChatMessages } from "@/features/chat/hooks/useChatMessages";
import ChatWindow from "@/features/chat/components/ChatWindow";
import { SENDABLE_ENROLLMENT_STATUSES } from "@/features/shared/utils/enrollmentStatus";

interface Props {
  roomId: string;
  teacherName: string;
  courseTitle: string | null;
  enrollmentStatus: string;
}

/**
 * Chat with the teacher, built into the class page (Part 2C §2). The
 * same room, endpoints and polling as `/parent/chat/[roomId]` — the
 * conversation history carries over — drawn as a card instead of a
 * full-screen page. Only mounted while the Chat tab is open, so a
 * parent on the Classes tab isn't polling messages.
 */
export default function ClassChatPanel({ roomId, teacherName, courseTitle, enrollmentStatus }: Props) {
  const canSend = SENDABLE_ENROLLMENT_STATUSES.has(enrollmentStatus);

  const { messages, loading, error, sending, sendMessage } = useChatMessages(
    `/api/parent/chat/${roomId}/messages`,
    canSend,
  );

  return (
    <ChatWindow
      embedded
      headerTitle={teacherName}
      headerSubtitle={courseTitle ?? undefined}
      messages={messages}
      loading={loading}
      error={error}
      sending={sending}
      viewerSenderRole="PARENT"
      canSend={canSend}
      onSend={sendMessage}
      disabledReason={
        canSend
          ? undefined
          : "This enrollment has ended, so messaging is closed. Your earlier messages are kept here."
      }
    />
  );
}
