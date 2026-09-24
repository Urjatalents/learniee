"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Megaphone, Send, Trash2, Users } from "lucide-react";

import { useCommunityMessages } from "@/features/community/hooks/useCommunityMessages";
import {
  COMMUNITY_MAX_MESSAGE_LENGTH,
  COMMUNITY_ROLE_LABEL,
  type CommunityMessageDto,
} from "@/features/community/types/community";

function formatWhen(value: string) {
  const date = new Date(value);
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  if (date.toDateString() === new Date().toDateString()) {
    return time;
  }

  return `${date.toLocaleDateString(undefined, { day: "numeric", month: "short" })}, ${time}`;
}

interface CommunityChatProps {
  /** Tailwind height class — differs per layout (navbar height), e.g. "h-[calc(100vh-4rem)]". */
  heightClass: string;
  /** Shows a back arrow in the header (used where there's no sidebar, e.g. Admin). */
  backPath?: string;
}

/**
 * The single Teacher + Admin + staff group chat. Shared by every role's
 * /community page; what the viewer can do (announce, remove) comes from
 * the server's `me` object, never from the page that renders this.
 */
export default function CommunityChat({ heightClass, backPath }: CommunityChatProps) {
  const router = useRouter();
  const {
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
  } = useCommunityMessages();

  const [draft, setDraft] = useState("");
  const [announce, setAnnounce] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  const newestId = messages.length ? messages[messages.length - 1].id : null;

  // Follow new messages only while the reader is already at the bottom,
  // so scrolling up to read history isn't yanked away by a poll.
  useEffect(() => {
    if (stickToBottomRef.current) {
      bottomRef.current?.scrollIntoView({ block: "end" });
    }
  }, [newestId]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  async function handleSend() {
    const body = draft.trim();
    if (!body || sending) return;

    if (announce && !window.confirm("Send this announcement to every teacher? They'll each get a notification.")) {
      return;
    }

    stickToBottomRef.current = true;

    const ok = await sendMessage(body, announce);

    if (ok) {
      setDraft("");
      setAnnounce(false);
    }
  }

  function handleDelete(message: CommunityMessageDto) {
    if (window.confirm("Remove this message for everyone?")) {
      deleteMessage(message.id);
    }
  }

  return (
    <div className={`flex flex-col ${heightClass} bg-gray-50`}>
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        {backPath && (
          <button
            type="button"
            onClick={() => router.push(backPath)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <span className="w-9 h-9 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center flex-shrink-0">
          <Users size={18} />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-gray-800 truncate">Teacher &amp; Staff Community</p>
          <p className="text-xs text-gray-500 truncate">
            Teachers, Admin and staff only — parents can&apos;t see this room.
          </p>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
      >
        {hasMore && (
          <div className="text-center">
            <button
              type="button"
              onClick={loadEarlier}
              disabled={loadingEarlier}
              className="text-xs font-semibold text-violet-600 hover:underline disabled:opacity-50"
            >
              {loadingEarlier ? "Loading…" : "Load earlier messages"}
            </button>
          </div>
        )}

        {loading && messages.length === 0 ? (
          <p className="text-gray-400 text-sm text-center mt-8">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="text-gray-400 text-sm text-center mt-8">
            No messages yet — say hello!
          </p>
        ) : (
          messages.map((message) => {
            const isOwn = me !== null && message.senderId === me.id && message.senderRole === me.role;
            const canRemove = Boolean(me?.canModerate) && !message.deleted;

            if (message.deleted) {
              return (
                <p key={message.id} className="text-center text-xs italic text-gray-400">
                  A message was removed by Admin.
                </p>
              );
            }

            if (message.isAnnouncement) {
              return (
                <div
                  key={message.id}
                  className="group relative bg-amber-50 border border-amber-300 rounded-2xl px-4 py-3"
                >
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                    <Megaphone size={13} />
                    Announcement · {message.senderName}
                  </p>
                  <p className="mt-1 text-sm text-gray-800 whitespace-pre-wrap break-words">
                    {message.body}
                  </p>
                  <p className="text-[10px] text-amber-700/70 mt-1">{formatWhen(message.createdAt)}</p>
                  {canRemove && (
                    <button
                      type="button"
                      onClick={() => handleDelete(message)}
                      className="absolute top-2 right-2 p-1 rounded text-amber-700/60 hover:text-red-600 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                      aria-label="Remove message"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            }

            return (
              <div
                key={message.id}
                className={`group flex items-start gap-1 ${isOwn ? "justify-end" : "justify-start"}`}
              >
                {isOwn && canRemove && (
                  <button
                    type="button"
                    onClick={() => handleDelete(message)}
                    className="mt-2 p-1 rounded text-gray-400 hover:text-red-600 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                    aria-label="Remove message"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                    isOwn
                      ? "bg-purple-600 text-white rounded-br-sm"
                      : "bg-white border text-gray-800 rounded-bl-sm"
                  }`}
                >
                  {!isOwn && (
                    <p className="text-[11px] font-semibold text-violet-700 mb-0.5">
                      {message.senderName}
                      <span className="ml-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-400">
                        {COMMUNITY_ROLE_LABEL[message.senderRole]}
                      </span>
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{message.body}</p>
                  <p className={`text-[10px] mt-1 ${isOwn ? "text-white/70" : "text-gray-400"}`}>
                    {formatWhen(message.createdAt)}
                  </p>
                </div>
                {!isOwn && canRemove && (
                  <button
                    type="button"
                    onClick={() => handleDelete(message)}
                    className="mt-2 p-1 rounded text-gray-400 hover:text-red-600 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                    aria-label="Remove message"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {error && <div className="bg-red-100 text-red-700 text-sm px-4 py-2">{error}</div>}

      {me && (
        <div className="bg-white border-t px-4 py-3">
          {announce && (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 mb-2">
              <Megaphone size={13} />
              Announcement — every teacher will be notified.
            </p>
          )}
          <div className="flex items-end gap-2">
            {me.canAnnounce && (
              <button
                type="button"
                onClick={() => setAnnounce((prev) => !prev)}
                aria-pressed={announce}
                aria-label="Send as announcement"
                title="Send as announcement"
                className={`w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center border transition ${
                  announce
                    ? "bg-amber-100 border-amber-400 text-amber-700"
                    : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
              >
                <Megaphone size={16} />
              </button>
            )}
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              maxLength={COMMUNITY_MAX_MESSAGE_LENGTH}
              placeholder={announce ? "Write an announcement for all teachers…" : "Type a message…"}
              className="flex-1 border rounded-2xl px-4 py-2 text-sm resize-none max-h-32 focus:outline-none focus:ring-2 focus:ring-purple-300"
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
        </div>
      )}
    </div>
  );
}
