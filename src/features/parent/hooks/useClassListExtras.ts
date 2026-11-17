"use client";

import { useCallback, useEffect, useState } from "react";

import type { ChatPreview } from "@/features/parent/types/classList";
import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";

/** enrollmentId -> open (unsubmitted) homework count. */
export function useOpenHomeworkCounts() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/parent/homework/summary", { cache: "no-store" });
      const data = await res.json();

      if (res.ok) setCounts(data.counts ?? {});
    } catch (err) {
      // Counts are decoration — never block the list on them.
      console.error("Homework summary error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useAutoRefresh(() => load(), { paths: ["/api/parent/homework/summary"] });

  return { counts, loading };
}

/** chatRoomId -> last message. */
export function useChatPreviews() {
  const [previews, setPreviews] = useState<Record<string, ChatPreview>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/parent/chat/previews", { cache: "no-store" });
      const data = await res.json();

      if (res.ok) {
        const list: ChatPreview[] = data.previews ?? [];
        setPreviews(Object.fromEntries(list.map((p) => [p.chatRoomId, p])));
      }
    } catch (err) {
      console.error("Chat previews error:", err);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useAutoRefresh(() => load(), { paths: ["/api/parent/chat/previews"], staleMs: 10_000 });

  return previews;
}
