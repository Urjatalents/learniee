"use client";

import { useChatMessages } from "@/features/chat/hooks/useChatMessages";
import ChatWindow from "@/features/chat/components/ChatWindow";
import { SENDABLE_ENROLLMENT_STATUSES } from "@/features/shared/utils/enrollmentStatus";

interface Props {
  roomId: string;
  studentName: string;
  courseTitle: string | null;
  enrollmentStatus: string;
}

/**
 * Chat with the parent, built into the Teacher's My Classes ↦ course
 * ↦ student page — the Teacher-side mirror of the Parent's
 * `ClassChatPanel`. Same room, endpoints and polling as
 * `/teacher/chat/[roomId]`, just drawn as a card instead of a
 * full-screen page. Only mounted while the Chat tab is open.
 */
export default function TeacherClassChatPanel({
  roomId,
  studentName,
  courseTitle,
  enrollmentStatus,
}: Props) {
  const canSend = SENDABLE_ENROLLMENT_STATUSES.has(enrollmentStatus);

  const { messages, loading, error, sending, sendMessage } = useChatMessages(
    `/api/teacher/chat/${roomId}/messages`,
    canSend,
  );

  return (
    <ChatWindow
      embedded
      headerTitle={studentName}
      headerSubtitle={courseTitle ?? undefined}
      messages={messages}
      loading={loading}
      error={error}
      sending={sending}
      viewerSenderRole="TEACHER"
      canSend={canSend}
      onSend={sendMessage}
      disabledReason={
        canSend
          ? undefined
          : "This enrollment was rejected or cancelled, so messaging is closed. Earlier messages are kept here."
      }
    />
  );
}
