"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";

import { useNotifications } from "@/features/shared/hooks/useNotifications";

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

/**
 * Replaces the static placeholder bell that used to sit here
 * (Notification Center was flagged as Phase 2, 06-OPEN-DECISIONS.md
 * #32) with a working dropdown — deliberately simpler than #32's
 * full bucketed/toggle version, see notification.service.ts's
 * doc-comment. Same dropdown/click-outside pattern as
 * `WalletBadge.tsx` / `DemoCouponButton.tsx` right next to it.
 */
export default function NotificationBell({
  buttonClassName,
}: {
  /** Override the trigger button styling (Parent top bar uses its own look). */
  buttonClassName?: string;
} = {}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { items, unreadCount, loading, markRead, markAllRead } = useNotifications();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function handleItemClick(item: { id: string; isRead: boolean; link: string | null }) {
    if (!item.isRead) {
      await markRead(item.id);
    }

    setOpen(false);

    if (item.link) {
      router.push(item.link);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Notifications"
        className={
          buttonClassName ??
          "relative w-9 h-9 rounded-full bg-violet-50 text-brand hover:bg-violet-100 flex items-center justify-center transition active:scale-[0.97]"
        }
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        // On phones the popover spans the screen under the header (a 320px panel anchored to a mid-row button clips off the left edge); from sm up it anchors to its button. Pops in from the top-right.
        <div className="fixed inset-x-3 top-[4.25rem] origin-top-right animate-pop-in sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-80 bg-white rounded-2xl border border-violet-100 shadow-playful z-50 flex flex-col max-h-[min(28rem,calc(100dvh-5rem))]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-violet-100 flex-shrink-0">
            <p className="text-sm font-bold text-gray-800">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead()}
                className="text-xs font-semibold text-brand hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="overflow-y-auto">
            {loading ? (
              <p className="text-xs text-gray-400 px-4 py-6 text-center">Loading...</p>
            ) : items.length === 0 ? (
              <p className="text-xs text-gray-500 px-4 py-6 text-center">
                Nothing yet — you&apos;ll see updates here as they happen.
              </p>
            ) : (
              <ul>
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleItemClick(item)}
                      className={`w-full text-left px-4 py-3 border-b border-violet-50 hover:bg-violet-50/60 transition ${
                        item.isRead ? "" : "bg-violet-50/40"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {!item.isRead && (
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-800">{item.title}</p>
                          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                            {item.message}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-1">
                            {timeAgo(item.createdAt)}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
