"use client";

import { useChatRooms } from "@/features/chat/hooks/useChatRooms";
import ChatRoomList from "@/features/chat/components/ChatRoomList";

export default function ParentChatPage() {
  const { rooms, loading, error } = useChatRooms("/api/parent/chat");

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-violet-900">Chat</h1>
        <p className="text-gray-500 mt-1">
          One conversation per enrolled child — message their teacher directly.
        </p>
      </div>

      <ChatRoomList
        rooms={rooms}
        loading={loading}
        error={error}
        viewerRole="parent"
        basePath="/parent/chat"
        emptyMessage="No conversations yet — one appears as soon as you enroll in a course."
      />
    </div>
  );
}
