"use client";

import Link from "next/link";
import { AlertTriangle, CalendarClock, CheckCircle2, GraduationCap } from "lucide-react";

import type { ParentEnrollment } from "@/features/parent/hooks/useEnrollments";
import { usesClassView } from "@/features/parent/utils/classView";
import { formatClassDay } from "@/features/shared/utils/classTimeLabels";
import { formatPlatformTime } from "@/lib/platformTime";

interface Props {
  enrollments: ParentEnrollment[];
}

/**
 * The three numbers at the top of My Classes: how many classes are
 * running, when the very next class is (across every course), and how
 * many finished classes are waiting for the parent's "All good".
 */
export default function MyClassesSummary({ enrollments }: Props) {
  const running = enrollments.filter(
    (enrollment) => usesClassView(enrollment) && enrollment.status === "ACTIVE",
  );

  if (running.length === 0) return null;

  const now = new Date();

  // The class that starts soonest, across every running course.
  let soonest: { enrollment: ParentEnrollment; startsAt: Date } | null = null;

  for (const enrollment of running) {
    const next = enrollment.classSummary?.nextClass;

    if (!next) continue;

    const startsAt = new Date(next.startsAt);

    if (!soonest || startsAt.getTime() < soonest.startsAt.getTime()) {
      soonest = { enrollment, startsAt };
    }
  }

  const toConfirm = running.reduce(
    (total, enrollment) => total + (enrollment.classSummary?.needsResponseCount ?? 0),
    0,
  );

  return (
    <div className="grid gap-3 sm:grid-cols-3 mb-8">
      <div className="flex items-center gap-3 bg-white border border-violet-100 rounded-2xl p-4">
        <span className="w-10 h-10 rounded-xl bg-violet-100 text-brand flex items-center justify-center flex-shrink-0">
          <GraduationCap size={19} />
        </span>
        <div className="min-w-0">
          <p className="font-heading text-2xl font-bold text-gray-800 leading-none">
            {running.length}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Active class{running.length === 1 ? "" : "es"}
          </p>
        </div>
      </div>

      {soonest ? (
        <Link
          href={`/parent/my-classes/${soonest.enrollment.id}`}
          className="flex items-center gap-3 bg-white border border-violet-100 rounded-2xl p-4 hover:border-violet-300 hover:shadow-playful transition"
        >
          <span className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0">
            <CalendarClock size={19} />
          </span>
          <div className="min-w-0">
            <p className="font-heading text-base font-bold text-gray-800 leading-tight truncate">
              {formatClassDay(soonest.startsAt, now)} · {formatPlatformTime(soonest.startsAt)}
            </p>
            <p className="text-xs text-gray-500 mt-1 truncate">
              Next class · {soonest.enrollment.course.courseTitle ?? "Course"}
            </p>
          </div>
        </Link>
      ) : (
        <div className="flex items-center gap-3 bg-white border border-violet-100 rounded-2xl p-4">
          <span className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0">
            <CalendarClock size={19} />
          </span>
          <div className="min-w-0">
            <p className="font-heading text-base font-bold text-gray-800 leading-tight">
              Nothing scheduled
            </p>
            <p className="text-xs text-gray-500 mt-1">Next class</p>
          </div>
        </div>
      )}

      <div
        className={`flex items-center gap-3 rounded-2xl p-4 border ${
          toConfirm > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-violet-100"
        }`}
      >
        <span
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            toConfirm > 0 ? "bg-amber-200/70 text-amber-800" : "bg-green-100 text-green-700"
          }`}
        >
          {toConfirm > 0 ? <AlertTriangle size={19} /> : <CheckCircle2 size={19} />}
        </span>
        <div className="min-w-0">
          <p className="font-heading text-base font-bold text-gray-800 leading-tight">
            {toConfirm > 0 ? `${toConfirm} to confirm` : "All caught up"}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {toConfirm > 0 ? "Finished classes need your answer" : "No classes waiting on you"}
          </p>
        </div>
      </div>
    </div>
  );
}
