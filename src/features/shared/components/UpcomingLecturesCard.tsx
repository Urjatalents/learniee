"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, PlayCircle, Video } from "lucide-react";

import type { CalendarOccurrence } from "@/features/shared/types/calendar";
import { formatScheduleTime } from "@/features/shared/utils/weekdays";
import { isSessionLive, todayKey } from "@/features/shared/utils/classSessionWindow";
import { isJoinWindowOpen } from "@/features/shared/utils/sessionOutcome";

interface Props {
  occurrences: CalendarOccurrence[];
  loading: boolean;
  role: "parent" | "teacher";
  limit?: number;
}

const DEFAULT_LIMIT = 6;

/**
 * Today's and upcoming scheduled lectures for a Parent or Teacher.
 * Today's occurrence(s) render as a larger, prominent "hero" card —
 * everything later renders smaller/more compact underneath — so
 * today's class visually reads as the one that actually matters
 * right now, not just another item in a uniform list.
 *
 * The action button (Join for Parent, Start Session for Teacher)
 * only appears on today's hero card, and is only clickable once
 * `isSessionLive` says the scheduled time has actually arrived (see
 * classSessionWindow.ts). Later sessions are always in the future,
 * so that button could never be enabled there — showing it anyway
 * as a permanently-disabled control reads as broken, so those cards
 * are plain info (date/time, other party, course) instead.
 *
 * Reads from the same `/api/parent/calendar` / `/api/teacher/calendar`
 * occurrences the existing calendar pages already use (current month
 * only — a session scheduled early next month won't show here until
 * that month is loaded, same limitation the old "Upcoming classes"
 * dashboard section already had).
 */
export default function UpcomingLecturesCard({
  occurrences,
  loading,
  role,
  limit = DEFAULT_LIMIT,
}: Props) {
  const router = useRouter();
  const today = todayKey();

  // Re-render every 30s so a button enables itself when its window
  // opens, without the page having to be reloaded.
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(timer);
  }, []);

  const upcoming = [...occurrences]
    .filter((o) => o.status === "SCHEDULED" && o.date >= today)
    .sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")))
    .slice(0, limit);

  const todaysSessions = upcoming.filter((o) => o.date === today);
  const laterSessions = upcoming.filter((o) => o.date !== today);

  function goToSession(occ: CalendarOccurrence) {
    router.push(
      role === "teacher"
        ? `/teacher/classes/${occ.id}/start`
        : `/parent/classes/${occ.id}/join`,
    );
  }

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-violet-100 bg-violet-50/60 animate-pulse h-28"
          />
        ))}
      </div>
    );
  }

  if (upcoming.length === 0) {
    return (
      <div className="bg-white border-2 border-dashed border-violet-200 rounded-3xl p-6 text-center text-sm text-gray-500">
        No lectures scheduled yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {todaysSessions.length > 0 && (
        <div
          className={`grid gap-4 ${
            todaysSessions.length > 1 ? "sm:grid-cols-2" : ""
          }`}
        >
          {todaysSessions.map((occ) => {
            // Cycle-model sessions (Part 1B) carry real start/end
            // instants: Start/Join is open from 10 minutes before the
            // start until the end. Legacy sessions keep the old
            // fixed-window check.
            const live =
              occ.startsAt && occ.endsAt
                ? isJoinWindowOpen(
                    { startsAt: new Date(occ.startsAt), endsAt: new Date(occ.endsAt) },
                    new Date(),
                  )
                : isSessionLive(occ.date, occ.time);
            const otherParty = role === "teacher" ? occ.studentName : occ.teacherName;
            const actionLabel = role === "teacher" ? "Start Session" : "Join Session";

            return (
              <div
                key={occ.id}
                className="rounded-3xl p-6 border-2 border-brand-yellow bg-amber-50 shadow-playful"
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-brand">
                    <CalendarClock size={16} />
                    {formatScheduleTime(occ.time) ?? "Today"}
                  </div>
                  <span className="flex-shrink-0 text-xs font-bold uppercase tracking-wide text-amber-800 bg-amber-200/70 px-3 py-1 rounded-full">
                    Today
                  </span>
                </div>

                <p className="text-lg font-bold text-gray-800 truncate">
                  {otherParty}
                </p>
                <p className="text-sm text-gray-600 truncate mb-4">
                  {occ.courseTitle || occ.subject || "Course"}
                </p>

                <button
                  type="button"
                  disabled={!live}
                  onClick={() => goToSession(occ)}
                  title={
                    live
                      ? undefined
                      : occ.startsAt
                        ? "This opens 10 minutes before the class starts."
                        : "This becomes available at the scheduled time."
                  }
                  className={`w-full flex items-center justify-center gap-2 text-sm font-bold px-4 py-3 rounded-full transition-colors ${
                    live
                      ? "text-white bg-green-600 hover:bg-green-700"
                      : "text-gray-400 bg-gray-100 cursor-not-allowed"
                  }`}
                >
                  {role === "teacher" ? <PlayCircle size={18} /> : <Video size={18} />}
                  {actionLabel}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {laterSessions.length > 0 && (
        <div className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {laterSessions.map((occ) => (
            <div
              key={occ.id}
              className="rounded-xl p-3 border border-violet-100 bg-white"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1 text-[11px] font-bold text-brand min-w-0">
                  <CalendarClock size={11} className="flex-shrink-0" />
                  <span className="truncate">
                    {occ.date}
                    {occ.time ? ` · ${formatScheduleTime(occ.time)}` : ""}
                  </span>
                </div>
                {role === "teacher" ? (
                  <PlayCircle size={13} className="flex-shrink-0 text-gray-300" />
                ) : (
                  <Video size={13} className="flex-shrink-0 text-gray-300" />
                )}
              </div>

              <p className="text-xs font-semibold text-gray-800 truncate">
                {role === "teacher" ? occ.studentName : occ.teacherName}
              </p>
              <p className="text-[11px] text-gray-500 truncate">
                {occ.courseTitle || occ.subject || "Course"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
