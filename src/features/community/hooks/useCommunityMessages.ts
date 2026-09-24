"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { CommunityMessageDto, CommunityViewer } from "@/features/community/types/community";

const ENDPOINT = "/api/community/messages";
const POLL_MS = 5000;

/** De-dupes by id (newer copy wins, so a deletion replaces the original) and sorts oldest first. */
function merge(prev: CommunityMessageDto[], incoming: CommunityMessageDto[]) {
  const byId = new Map(prev.map((m) => [m.id, m]));
  for (const message of incoming) {
    byId.set(message.id, message);
  }
  return Array.from(byId.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

async function readJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

/**
 * Loads the latest page, then polls `?after=<newest updatedAt>` every 5 s
 * while the tab is visible. Polling (not WebSocket/SSE) matches the rest
 * of the app's chat and works the same on Vercel and a self-hosted server.
 * The cursor follows `updatedAt`, so a deletion by Admin reaches everyone.
 */
export function useCommunityMessages() {
  const [messages, setMessages] = useState<CommunityMessageDto[]>([]);
  const [me, setMe] = useState<CommunityViewer | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const cursorRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);

  const advanceCursor = useCallback((incoming: CommunityMessageDto[]) => {
    for (const message of incoming) {
      if (!cursorRef.current || message.updatedAt > cursorRef.current) {
        cursorRef.current = message.updatedAt;
      }
    }
  }, []);

  const poll = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      const after = cursorRef.current;
      const url = after ? `${ENDPOINT}?after=${encodeURIComponent(after)}` : ENDPOINT;
      const res = await fetch(url, { method: "GET", cache: "no-store" });
      const data = await readJson(res);

      if (!res.ok) {
        throw new Error(data.error || "Failed to load messages.");
      }

      const incoming: CommunityMessageDto[] = data.messages ?? [];

      setMe(data.me ?? null);

      if (after) {
        if (incoming.length > 0) {
          setMessages((prev) => merge(prev, incoming));
        }
      } else {
        setMessages(incoming);
        setHasMore(Boolean(data.hasMore));
      }

      advanceCursor(incoming);
      setError("");
    } catch (err) {
      console.error("Load community messages error:", err);
      setError(err instanceof Error ? err.message : "Failed to load messages.");
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [advanceCursor]);

  useEffect(() => {
    poll();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        poll();
      }
    }, POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") poll();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [poll]);

  const sendMessage = useCallback(
    async (body: string, isAnnouncement = false) => {
      try {
        setSending(true);
        setError("");

        const res = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body, isAnnouncement }),
        });
        const data = await readJson(res);

        if (!res.ok) {
          throw new Error(data.error || "Failed to send message.");
        }

        setMessages((prev) => merge(prev, [data.message]));
        advanceCursor([data.message]);
        return true;
      } catch (err) {
        console.error("Send community message error:", err);
        setError(err instanceof Error ? err.message : "Failed to send message.");
        return false;
      } finally {
        setSending(false);
      }
    },
    [advanceCursor],
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      try {
        setError("");

        const res = await fetch(`${ENDPOINT}/${messageId}`, { method: "DELETE" });
        const data = await readJson(res);

        if (!res.ok) {
          throw new Error(data.error || "Failed to remove message.");
        }

        setMessages((prev) => merge(prev, [data.message]));
        advanceCursor([data.message]);
      } catch (err) {
        console.error("Delete community message error:", err);
        setError(err instanceof Error ? err.message : "Failed to remove message.");
      }
    },
    [advanceCursor],
  );

  const loadEarlier = useCallback(async () => {
    const oldest = messages[0];
    if (!oldest || loadingEarlier) return;

    try {
      setLoadingEarlier(true);

      const res = await fetch(`${ENDPOINT}?before=${encodeURIComponent(oldest.createdAt)}`, {
        cache: "no-store",
      });
      const data = await readJson(res);

      if (!res.ok) {
        throw new Error(data.error || "Failed to load earlier messages.");
      }

      setMessages((prev) => merge(prev, data.messages ?? []));
      setHasMore(Boolean(data.hasMore));
    } catch (err) {
      console.error("Load earlier community messages error:", err);
      setError(err instanceof Error ? err.message : "Failed to load earlier messages.");
    } finally {
      setLoadingEarlier(false);
    }
  }, [messages, loadingEarlier]);

  return {
    messages,
    me,
    hasMore,
    loading,
    loadingEarlier,
    sending,
    error,
    sendMessage,
    deleteMessage,
    loadEarlier,
  };
}
