"use client";

import Link from "next/link";
import { CalendarClock, ChevronRight, RefreshCw } from "lucide-react";

import ChildAvatar from "@/features/parent/components/ChildAvatar";
import type { ParentEnrollment } from "@/features/parent/hooks/useEnrollments";
import CycleProgressRing from "@/features/shared/components/CycleProgressRing";
import {
  getEnrollmentStatusLabel,
  getEnrollmentStatusStyle,
} from "@/features/shared/utils/enrollmentStatus";
import { formatClassDay } from "@/features/shared/utils/classTimeLabels";
import { displayName } from "@/features/shared/utils/displayName";
import { formatSchedule } from "@/features/shared/utils/weekdays";
import { formatPlatformTime } from "@/lib/platformTime";

interface Props {
  enrollment: ParentEnrollment;
}

/**
 * One enrolled course on the My Classes list (Part 2C): who it is
 * with, how far the cycle has come, and when the next class is. The
 * whole card opens the class page.
 */
export default function MyClassCard({ enrollment }: Props) {
  const summary = enrollment.classSummary ?? null;
  const progress = summary?.progress ?? null;
  const next = summary?.nextClass ?? null;
  const needsResponse = summary?.needsResponseCount ?? 0;
  const ended = enrollment.status === "COMPLETED";
  const teacherName = displayName(enrollment.teacher);
  const now = new Date();

  let progressText: string | null = null;

  if (progress) {
    progressText =
      progress.nextSessionNumber !== null
        ? `Session ${progress.nextSessionNumber} of ${progress.sessionCount}`
        : `${progress.countedSessions} of ${progress.sessionCount} classes held`;
  }

  let windowText: string | null = null;

  if (progress && !ended && progress.status === "OPEN" && progress.dayOfWindow > 0 && progress.daysLeft > 0) {
    windowText = `${progress.daysLeft} day${progress.daysLeft === 1 ? "" : "s"} left in this cycle`;
  }

  const nextStart = next ? new Date(next.startsAt) : null;
  const nextIsToday = nextStart ? formatClassDay(nextStart, now) === "Today" : false;

  return (
    <Link
      href={`/parent/my-classes/${enrollment.id}`}
      className="group flex flex-col overflow-hidden bg-white border border-violet-100 rounded-3xl hover:border-violet-300 hover:shadow-playful transition"
    >
      <div
        className={`h-1.5 ${
          ended ? "bg-gray-200" : "bg-gradient-to-r from-brand-light via-brand to-brand-yellow"
        }`}
      />

      <div className="flex flex-col flex-1 gap-4 p-5">
        <div className="flex items-start gap-3">
          <ChildAvatar name={teacherName} size="sm" />

          <div className="min-w-0 flex-1">
            <p className="font-heading font-bold text-gray-800 truncate">
              {enrollment.course.courseTitle ?? "Untitled course"}
            </p>
            <p className="text-sm text-gray-500 truncate">with {teacherName}</p>
            <p className="text-xs text-gray-400 truncate">
              For {displayName(enrollment.student)}
            </p>
          </div>

          <span
            className={`flex-shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full ${getEnrollmentStatusStyle(
              enrollment.status,
            )}`}
          >
            {getEnrollmentStatusLabel(enrollment.status, "parent")}
          </span>
        </div>

        {progress ? (
          <div className="flex items-center gap-4 rounded-2xl bg-violet-50/60 border border-violet-100 px-4 py-3">
            <CycleProgressRing
              completed={progress.countedSessions}
              total={progress.sessionCount}
              size={56}
              strokeWidth={5}
            />

            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-800">{progressText}</p>
              <p className="text-xs text-gray-500">
                Cycle {progress.cycleNumber}
                {windowText ? ` · ${windowText}` : ""}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3 text-xs text-gray-500">
            No cycle has been set up yet.
          </div>
        )}

        <div
          className={`flex items-center gap-3 rounded-2xl px-4 py-3 border ${
            nextIsToday ? "bg-amber-50 border-amber-200" : "bg-white border-gray-100"
          }`}
        >
          <span
            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
              nextIsToday ? "bg-amber-200/70 text-amber-800" : "bg-violet-100 text-brand"
            }`}
          >
            <CalendarClock size={16} />
          </span>

          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
              {next?.isMakeup ? "Make-up class" : "Next class"}
            </p>
            <p className="text-sm font-semibold text-gray-800 truncate">
              {nextStart
                ? `${formatClassDay(nextStart, now)} · ${formatPlatformTime(nextStart)}`
                : ended
                  ? "This enrollment has ended"
                  : "Nothing scheduled right now"}
            </p>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
          <p className="flex items-center gap-1.5 text-[11px] text-gray-400 min-w-0">
            <RefreshCw size={11} className="flex-shrink-0" />
            <span className="truncate">
              {formatSchedule(enrollment.scheduleDays, enrollment.scheduleTime)}
            </span>
          </p>

          <span className="flex items-center gap-0.5 text-xs font-bold text-brand flex-shrink-0">
            Open class
            <ChevronRight
              size={15}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </span>
        </div>

        {needsResponse > 0 && (
          <p className="text-[11px] font-semibold px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-center">
            {needsResponse} class{needsResponse === 1 ? "" : "es"} waiting for your confirmation
          </p>
        )}
      </div>
    </Link>
  );
}
