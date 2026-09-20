"use client";

import Link from "next/link";

import { useEnrollmentSessions } from "@/features/teacher/hooks/useEnrollmentSessions";
import { formatScheduleTime } from "@/features/shared/utils/weekdays";
import {
  SESSION_STATUS_LABEL,
  SESSION_STATUS_STYLE,
} from "@/features/shared/utils/sessionOutcome";

interface Props {
  enrollmentId: string;
  onSessionMarked?: (enrollment: Record<string, unknown>) => void;
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
    return <p className="text-xs text-gray-400 mt-2">Loading sessions…</p>;
  }

  if (error) {
    return <p className="text-xs text-red-600 mt-2">{error}</p>;
  }

  if (sessions.length === 0) {
    return (
      <p className="text-xs text-gray-400 mt-2">
        No sessions generated yet — set a schedule above first.
      </p>
    );
  }

  return (
    <div className="mt-2 space-y-1 max-h-56 overflow-y-auto pr-1">
      {sessions.map((s) => (
        <div
          key={s.id}
          className="flex items-center justify-between gap-2 text-xs border border-gray-100 rounded-lg px-2.5 py-1.5"
        >
          <span className="text-gray-600">
            {new Date(s.scheduledDate).toLocaleDateString()}
            {s.scheduledTime && ` · ${formatScheduleTime(s.scheduledTime)}`}
          </span>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className={`px-2 py-0.5 rounded-full font-semibold ${
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
                className="text-[10px] font-bold text-white bg-brand hover:bg-brand-dark px-2 py-1 rounded-full"
              >
                Open
              </Link>
            )}

            {/* Part 2A: a finished cycle class keeps its page — the class
                summary is added there. */}
            {s.status !== "SCHEDULED" && s.cycleId && (
              <Link
                href={`/teacher/classes/${s.id}/start`}
                className="text-[10px] font-bold text-brand hover:underline"
              >
                Details
              </Link>
            )}

            {s.status === "SCHEDULED" && !s.cycleId && (
              <button
                type="button"
                onClick={() => handleMark(s.id)}
                disabled={markingId === s.id}
                className="text-[10px] font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-40 px-2 py-1 rounded-full"
              >
                {markingId === s.id ? "…" : "Mark done"}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
