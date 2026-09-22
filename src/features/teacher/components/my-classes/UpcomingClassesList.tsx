"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import type { ClassSessionItem } from "@/features/parent/types/myClasses";
import { formatClassDay, formatDateTile } from "@/features/shared/utils/classTimeLabels";
import { formatPlatformTime } from "@/lib/platformTime";

interface Props {
  sessions: ClassSessionItem[];
}

const SHOWN = 8;

/**
 * A student's upcoming classes, Teacher side. Each row opens the
 * existing Start/Join session-flow page
 * (`/teacher/classes/[sessionId]/start`) — Start opens 10 minutes
 * before the class, same rule the "live now" badge on the class card
 * uses.
 */
export default function UpcomingClassesList({ sessions }: Props) {
  if (sessions.length === 0) {
    return (
      <div className="bg-white border-2 border-dashed border-violet-200 rounded-2xl p-6 text-sm text-gray-500 text-center">
        No upcoming classes scheduled for this student right now.
      </div>
    );
  }

  const shown = sessions.slice(0, SHOWN);
  const hidden = sessions.length - shown.length;
  const now = new Date();

  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">Coming up</h2>

      <div className="space-y-2">
        {shown.map((session) => {
          const start = new Date(session.startsAt);
          const tile = formatDateTile(start);

          return (
            <Link
              key={session.id}
              href={`/teacher/classes/${session.id}/start`}
              className="group flex items-center gap-3 bg-white border border-violet-100 rounded-2xl px-3 py-2.5 hover:border-violet-300 hover:shadow-playful transition"
            >
              <span className="w-12 flex-shrink-0 rounded-xl bg-violet-50 border border-violet-100 text-center py-1">
                <span className="block text-[10px] font-bold uppercase text-brand leading-tight">
                  {tile.month}
                </span>
                <span className="block font-heading text-lg font-bold text-gray-800 leading-tight">
                  {tile.day}
                </span>
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-gray-800 truncate">
                  {formatClassDay(start, now)} · {formatPlatformTime(start)}
                </span>
                <span className="block text-xs text-gray-400">
                  {session.isMakeup
                    ? "Make-up class"
                    : session.sessionNumber
                      ? `Class ${session.sessionNumber}`
                      : "Class"}
                </span>
              </span>

              <ChevronRight
                size={16}
                className="text-gray-300 group-hover:text-brand transition-colors flex-shrink-0"
              />
            </Link>
          );
        })}
      </div>

      {hidden > 0 && (
        <p className="text-xs text-gray-400 mt-2">
          + {hidden} more —{" "}
          <Link href="/teacher/calendar" className="text-brand hover:underline">
            see them all on the calendar
          </Link>
        </p>
      )}
    </section>
  );
}
