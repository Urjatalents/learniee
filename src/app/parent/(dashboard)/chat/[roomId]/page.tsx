"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";

import { useChatRooms } from "@/features/chat/hooks/useChatRooms";
import { useChatMessages } from "@/features/chat/hooks/useChatMessages";
import { displayName } from "@/features/chat/types/chat";
import ChatWindow from "@/features/chat/components/ChatWindow";
import { SENDABLE_ENROLLMENT_STATUSES } from "@/features/shared/utils/enrollmentStatus";
import { usesClassView } from "@/features/parent/utils/classView";


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

  const { messages, loading, error, sending, sendMessage } = useChatMessages(
    `/api/parent/chat/${roomId}/messages`,
    true,
  );

  // Part 2C: a cycle-model enrollment's chat lives on its My Classes
  // page. Legacy enrollments (and ones not active yet) keep this page.
  const router = useRouter();
  const opensInMyClasses = !!room && usesClassView(room.enrollment);
  const myClassesEnrollmentId = room?.enrollment.id;

  useEffect(() => {
    if (opensInMyClasses && myClassesEnrollmentId) {
      router.replace(`/parent/my-classes/${myClassesEnrollmentId}?tab=chat`);
    }
  }, [opensInMyClasses, myClassesEnrollmentId, router]);

  const canSend = !room || SENDABLE_ENROLLMENT_STATUSES.has(room.enrollment.status);

  if (opensInMyClasses) {
    return <p className="p-6 text-gray-500">Opening your class…</p>;
  }

  return (
    <ChatWindow
      headerTitle={room ? displayName(room.teacher) : "Conversation"}
      headerSubtitle={room ? room.course.courseTitle ?? undefined : undefined}
      backPath="/parent/my-classes"
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
          : "This enrollment was rejected or cancelled, so messaging is closed."
      }
    />
  );
}
