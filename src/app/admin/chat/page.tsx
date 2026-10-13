"use client";

import { useMemo, useState } from "react";

import { useChatRooms } from "@/features/chat/hooks/useChatRooms";
import { displayName } from "@/features/chat/types/chat";
import ChatRoomList from "@/features/chat/components/ChatRoomList";
import {
  AdminPage,
  AdminPageHeader,
  AdminPill,
  AdminSearch,
} from "@/features/admin/components/ui/primitives";

export default function AdminChatPage() {
  const { rooms, loading, error } = useChatRooms("/api/admin/chat");
  const [search, setSearch] = useState("");
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  const flaggedCount = useMemo(
    () => rooms.filter((room) => room.hasFlaggedMessages).length,
    [rooms],
  );

  // Client-side search over the already-loaded room list — the
  // `/api/admin/chat` route also accepts teacherId/parentId/courseId
  // query params for programmatic filtering, but a free-text name
  // search is what's actually useful from this page directly.
  const filteredRooms = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rooms.filter((room) => {
      if (flaggedOnly && !room.hasFlaggedMessages) return false;
      if (!query) return true;

      const haystack = [
        displayName(room.parent),
        displayName(room.teacher),
        displayName(room.student),
        room.course.courseTitle ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [rooms, search, flaggedOnly]);

  return (
    <AdminPage>
      <AdminPageHeader
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "Classes and safety" }]}
        title="Chat monitor"
        description="View any parent ↔ teacher conversation. Read-only: Admin can oversee messages but not send as either party."
      />

      <div className="flex flex-wrap items-center gap-4">
        <AdminSearch
          value={search}
          onChange={setSearch}
          placeholder="Search by parent, teacher, child or course"
        />

        <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[15px] font-bold">
          <input
            type="checkbox"
            checked={flaggedOnly}
            onChange={(e) => setFlaggedOnly(e.target.checked)}
            className="size-5 rounded accent-brand"
          />
          Show flagged conversations only
          {flaggedCount > 0 && <AdminPill tone="warn">{flaggedCount}</AdminPill>}
        </label>
      </div>

      <ChatRoomList
        rooms={filteredRooms}
        loading={loading}
        error={error}
        viewerRole="admin"
        basePath="/admin/chat"
        emptyMessage={
          flaggedOnly
            ? "No flagged conversations."
            : search
              ? "No conversations match that search."
              : "No conversations exist yet."
        }
      />
    </AdminPage>
  );
}
