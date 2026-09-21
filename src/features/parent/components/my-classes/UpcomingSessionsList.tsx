"use client";

import Link from "next/link";

import type { ClassSessionItem } from "@/features/parent/types/myClasses";
import { formatPlatformTime } from "@/lib/platformTime";

interface Props {
  sessions: ClassSessionItem[];
}

const SHOWN = 5;

/** The classes after the next one — each opens its own class page (reschedule / cancel live there). */
export default function UpcomingSessionsList({ sessions }: Props) {
  if (sessions.length === 0) return null;

  const shown = sessions.slice(0, SHOWN);
  const hidden = sessions.length - shown.length;

  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
        Coming up
      </h2>

      <div className="space-y-2">
        {shown.map((session) => (
          <Link
            key={session.id}
            href={`/parent/classes/${session.id}/join`}
            className="flex items-center justify-between gap-3 bg-white border border-violet-100 rounded-xl px-4 py-3 text-sm hover:border-violet-300 transition"
          >
            <span className="text-gray-700">
              {formatPlatformTime(new Date(session.startsAt), true)}
            </span>
            <span className="text-xs text-gray-400 flex-shrink-0">
              {session.isMakeup ? "Make-up class" : session.sessionNumber ? `Class ${session.sessionNumber}` : "Class"}
            </span>
          </Link>
        ))}
      </div>

      {hidden > 0 && (
        <p className="text-xs text-gray-400 mt-2">
          + {hidden} more —{" "}
          <Link href="/parent/calendar" className="text-brand hover:underline">
            see them all on the calendar
          </Link>
        </p>
      )}
    </section>
  );
}
