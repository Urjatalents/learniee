"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ChatMessage } from "@/features/chat/types/chat";

const MESSAGE_POLL_MS = 4000;

/**
 * Merges `incoming` into `prev`, de-duping by `id`. Needed because the
 * poll loop and the optimistic append in `sendMessage` can race: a poll
 * request in flight when a message is sent may resolve afterwards and
 * still include that same message (it was fetched with a stale `after`
 * cursor), producing a duplicate entry/key otherwise.
 */
function mergeMessages(prev: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map(prev.map((m) => [m.id, m]));
  for (const message of incoming) {
    byId.set(message.id, message);
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

/**
 * Fetches and polls a single room's messages via `messagesEndpoint`
 * (e.g. `/api/parent/chat/<roomId>/messages`), using the `after`
 * query param so each poll only asks for messages newer than the
 * last one already held — see the matching GET routes.
 *
 * No WebSocket/SSE here on purpose: the app is Next.js Route
 * Handlers on Vercel (serverless), which doesn't hold a persistent
 * connection open. Plain polling reuses the existing stack instead
 * of introducing a new realtime-infra decision (e.g. Pusher/Ably)
 * that isn't in 02-ARCHITECTURE.md yet — worth revisiting there if
 * chat volume ever makes 4s latency feel too slow.
 *
 * `canSend: false` (Admin's read-only view) skips polling for new
 * messages beyond the initial load reason to keep this simple, and
 * `sendMessage` is a no-op guarded by `canSend`.
 */
export function useChatMessages(messagesEndpoint: string, canSend: boolean) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const lastTimestampRef = useRef<string | null>(null);

  const poll = useCallback(async () => {
    try {
      const after = lastTimestampRef.current;
      const url = after
        ? `${messagesEndpoint}?after=${encodeURIComponent(after)}`
        : messagesEndpoint;

      const res = await fetch(url, { method: "GET", cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load messages.");
      }

      const incoming: ChatMessage[] = data.messages ?? [];

      if (incoming.length > 0) {
        setMessages((prev) => (after ? mergeMessages(prev, incoming) : incoming));
        lastTimestampRef.current = incoming[incoming.length - 1].createdAt;
      }

      setError("");
    } catch (err) {
      console.error("Load chat messages error:", err);
      setError(err instanceof Error ? err.message : "Failed to load messages.");
    } finally {
      setLoading(false);
    }
  }, [messagesEndpoint]);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    lastTimestampRef.current = null;

    poll();

    const interval = setInterval(poll, MESSAGE_POLL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messagesEndpoint]);

  async function sendMessage(body: string) {
    if (!canSend) return;

    try {
      setSending(true);
      setError("");

      const res = await fetch(messagesEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send message.");
      }

      setMessages((prev) => mergeMessages(prev, [data.message]));
      lastTimestampRef.current = data.message.createdAt;
    } catch (err) {
      console.error("Send chat message error:", err);
      setError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  /**
   * Reports a message from the other person to Admin. Throws with the
   * server's message on failure so the caller (ChatWindow) can show it
   * next to the message instead of in the page-level error bar.
   */
  async function reportMessage(messageId: string, reason?: string) {
    const res = await fetch(`${messagesEndpoint}/${encodeURIComponent(messageId)}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || "Failed to report the message.");
    }

    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId ? { ...message, reportedByMe: true } : message,
      ),
    );
  }

  return { messages, loading, error, sending, sendMessage, reportMessage };
}