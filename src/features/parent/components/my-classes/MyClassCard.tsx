"use client";

import Link from "next/link";
import { CalendarClock, ChevronRight } from "lucide-react";

import type { ParentEnrollment } from "@/features/parent/hooks/useEnrollments";
import {
  getEnrollmentStatusLabel,
  getEnrollmentStatusStyle,
} from "@/features/shared/utils/enrollmentStatus";
import { displayName } from "@/features/shared/utils/displayName";
import { formatSchedule } from "@/features/shared/utils/weekdays";
import { formatPlatformTime } from "@/lib/platformTime";

interface Props {
  enrollment: ParentEnrollment;
}

/**
 * One enrolled course on the My Classes list (Part 2C): who it is
 * with, where the cycle stands and when the next class is. The whole
 * card opens the class page.
 */
export default function MyClassCard({ enrollment }: Props) {
  const summary = enrollment.classSummary ?? null;
  const progress = summary?.progress ?? null;
  const next = summary?.nextClass ?? null;
  const needsResponse = summary?.needsResponseCount ?? 0;
  const ended = enrollment.status === "COMPLETED";

  let progressText: string | null = null;

  if (progress) {
    progressText =
      progress.nextSessionNumber !== null
        ? `Session ${progress.nextSessionNumber} of ${progress.sessionCount}`
        : `${progress.countedSessions} of ${progress.sessionCount} classes held`;

    if (!ended && progress.status === "OPEN" && progress.dayOfWindow > 0 && progress.daysLeft > 0) {
      progressText += ` · ${progress.daysLeft} day${progress.daysLeft === 1 ? "" : "s"} left`;
    }
  }

  return (
    <Link
      href={`/parent/my-classes/${enrollment.id}`}
      className="block bg-white border border-violet-100 rounded-2xl p-5 hover:border-violet-300 hover:shadow-playful transition"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-heading font-bold text-gray-800 truncate">
            {enrollment.course.courseTitle ?? "Untitled course"}
          </p>
          <p className="text-sm text-gray-500 truncate">
            with {displayName(enrollment.teacher)} · {displayName(enrollment.student)}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getEnrollmentStatusStyle(
              enrollment.status,
            )}`}
          >
            {getEnrollmentStatusLabel(enrollment.status, "parent")}
          </span>
          <ChevronRight size={18} className="text-gray-400" />
        </div>
      </div>

      {progressText && <p className="text-sm font-semibold text-violet-800 mt-3">{progressText}</p>}

      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
        <CalendarClock size={13} className="flex-shrink-0" />
        {next
          ? `${next.isMakeup ? "Make-up class" : "Next class"}: ${formatPlatformTime(
              new Date(next.startsAt),
              true,
            )}`
          : ended
            ? "This enrollment has ended."
            : "No upcoming classes right now."}
      </div>

      <p className="text-[11px] text-gray-400 mt-1">
        {formatSchedule(enrollment.scheduleDays, enrollment.scheduleTime)}
      </p>

      {needsResponse > 0 && (
        <p className="inline-block mt-3 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
          {needsResponse} class{needsResponse === 1 ? "" : "es"} to confirm
        </p>
      )}
    </Link>
  );
}
