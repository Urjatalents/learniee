"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";

import type { ChatMessage, ChatSenderRole } from "@/features/chat/types/chat";

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

interface ChatWindowProps {
  headerTitle: string;
  headerSubtitle?: string;
  /** Where the header's back arrow goes. Not needed when `embedded`. */
  backPath?: string;
  messages: ChatMessage[];
  loading: boolean;
  error: string;
  sending: boolean;
  /** The viewer's own sender role, so their messages align right. `null` for Admin — every bubble is "theirs" (someone else's) since Admin only ever views, never sends. */
  viewerSenderRole: ChatSenderRole | null;
  canSend: boolean;
  onSend: (body: string) => Promise<void> | void;
  disabledReason?: string;
  /**
   * Draws the chat as a card inside another page (the Parent's My
   * Classes page) instead of a full-screen conversation: no header,
   * no back arrow, a fixed height.
   */
  embedded?: boolean;
}

export default function ChatWindow({
  headerTitle,
  headerSubtitle,
  backPath,
  messages,
  loading,
  error,
  sending,
  viewerSenderRole,
  canSend,
  onSend,
  disabledReason,
  embedded = false,
}: ChatWindowProps) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function handleSend() {
    const body = draft.trim();
    if (!body || sending) return;

    setDraft("");
    await onSend(body);
  }

  return (
    <div
      className={
        embedded
          ? "flex flex-col h-[32rem] max-h-[70vh] bg-gray-50 border border-violet-100 rounded-2xl overflow-hidden"
          : "flex flex-col h-[calc(100vh-3.5rem)] bg-gray-50"
      }
    >
      {!embedded && (
        <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
          {backPath && (
            <button
              type="button"
              onClick={() => router.push(backPath)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100"
              aria-label="Back to conversations"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 truncate">{headerTitle}</p>
            {headerSubtitle && (
              <p className="text-xs text-gray-500 truncate">{headerSubtitle}</p>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading && messages.length === 0 ? (
          <p className="text-gray-400 text-sm text-center mt-8">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="text-gray-400 text-sm text-center mt-8">
            No messages yet — say hello!
          </p>
        ) : (
          messages.map((message) => {
            const isOwn = viewerSenderRole !== null && message.senderRole === viewerSenderRole;
            // Admin-only: viewerSenderRole is null exactly when this is
            // the Admin's read-only view (see the prop's doc-comment),
            // so this never leaks to the Parent/Teacher who sent or
            // received the message — see chat.service.ts's sendMessage.
            const isAdminView = viewerSenderRole === null;

            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                    message.containsPhoneNumber && isAdminView
                      ? "bg-amber-50 border border-amber-300 text-gray-800 rounded-bl-sm"
                      : isOwn
                        ? "bg-purple-600 text-white rounded-br-sm"
                        : "bg-white border text-gray-800 rounded-bl-sm"
                  }`}
                >
                  {viewerSenderRole === null && (
                    <p className="text-[10px] font-semibold uppercase tracking-wide opacity-60 mb-0.5">
                      {message.senderRole === "PARENT" ? "Parent" : "Teacher"}
                    </p>
                  )}
                  {message.containsPhoneNumber && isAdminView && (
                    <p className="text-[10px] font-semibold text-amber-700 mb-1">
                      ⚠ Possible phone number — hidden from the other party
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{message.body}</p>
                  {message.containsPhoneNumber && isAdminView && message.originalBody && (
                    <p className="whitespace-pre-wrap break-words text-xs text-amber-800 mt-1 border-t border-amber-200 pt-1">
                      Original: {message.originalBody}
                    </p>
                  )}
                  <p
                    className={`text-[10px] mt-1 ${
                      isOwn ? "text-white/70" : "text-gray-400"
                    }`}
                  >
                    {formatTime(message.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 text-sm px-4 py-2">{error}</div>
      )}

      {canSend ? (
        <div className="bg-white border-t px-4 py-3 flex items-center gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message…"
            className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !draft.trim()}
            className="w-10 h-10 flex-shrink-0 rounded-full bg-purple-600 text-white flex items-center justify-center disabled:opacity-40"
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </div>
      ) : (
        disabledReason && (
          <div className="bg-gray-100 text-gray-500 text-sm text-center px-4 py-3">
            {disabledReason}
          </div>
        )
      )}
    </div>
  );
}
