"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import {
  useEnrollmentSessions,
  type ClassSessionRow,
} from "@/features/teacher/hooks/useEnrollmentSessions";
import { formatClassDay } from "@/features/shared/utils/classTimeLabels";
import { formatScheduleTime } from "@/features/shared/utils/weekdays";
import {
  SESSION_STATUS_LABEL,
  SESSION_STATUS_STYLE,
} from "@/features/shared/utils/sessionOutcome";
import { formatPlatformTime } from "@/lib/platformTime";

interface Props {
  enrollmentId: string;
  onSessionMarked?: (enrollment: Record<string, unknown>) => void;
}

/** "Tue, 5 Mar · 4:30 pm" — from the real start time when there is one, else the stored date + time. */
function whenLabel(session: ClassSessionRow): string {
  if (session.startsAt) {
    const start = new Date(session.startsAt);

    return `${formatClassDay(start)} · ${formatPlatformTime(start)}`;
  }

  // Legacy rows: `scheduledDate` is a calendar date stored as UTC midnight.
  const date = new Date(session.scheduledDate).toLocaleDateString("en-IN", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return session.scheduledTime ? `${date} · ${formatScheduleTime(session.scheduledTime)}` : date;
}

/**
 * Real, dated class occurrences for one enrollment — generated from
 * its `scheduleDays`/`scheduleTime` (`classSession.service.ts`).
 * Lets a Teacher mark any specific SCHEDULED date complete, not just
 * whichever one is "next due" (the quick one-click button next to
 * this list still covers that fast path) — legacy sessions only.
 * Cycle-model sessions link to their Start / End page instead.
 */
export default function SessionsList({ enrollmentId, onSessionMarked }: Props) {
  const { sessions, loading, error, markingId, markComplete } = useEnrollmentSessions(
    enrollmentId,
    true,
  );

  async function handleMark(sessionId: string) {
    const enrollment = await markComplete(sessionId);
    if (enrollment) onSessionMarked?.(enrollment);
  }

  if (loading) {
    return <p className="text-xs text-gray-400 mt-3">Loading sessions…</p>;
  }

  if (error) {
    return <p className="text-xs text-red-600 mt-3">{error}</p>;
  }

  if (sessions.length === 0) {
    return (
      <p className="text-xs text-gray-400 mt-3">
        No sessions generated yet — set a schedule above first.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-2 max-h-80 overflow-y-auto pr-1">
      {sessions.map((s) => (
        <div
          key={s.id}
          className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl border border-violet-100 bg-white px-3 py-2.5"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{whenLabel(s)}</p>
            {s.sessionNumber ? (
              <p className="text-[11px] text-gray-400">Class {s.sessionNumber}</p>
            ) : null}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${
                SESSION_STATUS_STYLE[s.status] ?? "bg-gray-100 text-gray-600"
              }`}
            >
              {SESSION_STATUS_LABEL[s.status] ?? s.status}
            </span>

            {/* Cycle-model sessions are run from their own page
                (Start / End) — never marked done by hand. */}
            {s.status === "SCHEDULED" && s.cycleId && (
              <Link
                href={`/teacher/classes/${s.id}/start`}
                className="inline-flex items-center gap-1 text-xs font-bold text-white bg-brand hover:bg-brand-dark px-3.5 py-1.5 rounded-full transition-colors"
              >
                Open
                <ArrowRight size={12} />
              </Link>
            )}

            {/* Part 2A: a finished cycle class keeps its page — the class
                summary is added there. */}
            {s.status !== "SCHEDULED" && s.cycleId && (
              <Link
                href={`/teacher/classes/${s.id}/start`}
                className="inline-flex items-center gap-1 text-xs font-bold text-brand bg-violet-50 hover:bg-violet-100 px-3.5 py-1.5 rounded-full transition-colors"
              >
                Details
                <ArrowRight size={12} />
              </Link>
            )}

            {s.status === "SCHEDULED" && !s.cycleId && (
              <button
                type="button"
                onClick={() => handleMark(s.id)}
                disabled={markingId === s.id}
                className="inline-flex items-center gap-1 text-xs font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-40 px-3.5 py-1.5 rounded-full transition-colors"
              >
                <Check size={12} strokeWidth={3} />
                {markingId === s.id ? "…" : "Mark done"}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
