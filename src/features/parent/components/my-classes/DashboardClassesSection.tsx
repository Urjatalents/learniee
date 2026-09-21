"use client";

import Link from "next/link";
import { ArrowRight, ChevronRight, Clock, GraduationCap } from "lucide-react";

import {
  useParentEnrollments,
  type ParentEnrollment,
} from "@/features/parent/hooks/useEnrollments";
import CycleProgressRing from "@/features/shared/components/CycleProgressRing";
import { formatClassDay } from "@/features/shared/utils/classTimeLabels";
import { displayName } from "@/features/shared/utils/displayName";
import {
  getEnrollmentStatusLabel,
  getEnrollmentStatusStyle,
} from "@/features/shared/utils/enrollmentStatus";
import { formatSchedule } from "@/features/shared/utils/weekdays";
import { formatPlatformTime } from "@/lib/platformTime";

interface Props {
  /** Only show this child's classes; null/undefined = every child. */
  studentId?: string | null;
  /** How many class cards to show before "View all". */
  limit?: number;
}

/** Enrollments that are over or never started don't belong in a "my classes" glance. */
const HIDDEN_STATUSES = new Set(["REJECTED", "CANCELLED", "COMPLETED"]);

/** { done, total } for the little progress ring, or null when there's nothing to count yet. */
function ringValues(enrollment: ParentEnrollment): { done: number; total: number } | null {
  const progress = enrollment.classSummary?.progress;

  if (progress) return { done: progress.countedSessions, total: progress.sessionCount };

  const running = ["ACTIVE", "APPROVED", "LAPSED"].includes(enrollment.status);

  if (enrollment.isLegacy && running && enrollment.sessionsPerMonth > 0) {
    return { done: enrollment.sessionsCompletedInCycle, total: enrollment.sessionsPerMonth };
  }

  return null;
}

function nextClassTime(enrollment: ParentEnrollment): number {
  const next = enrollment.classSummary?.nextClass;

  return next ? new Date(next.startsAt).getTime() : Number.POSITIVE_INFINITY;
}

/**
 * A small "My classes" glance for the Parent home page: each running
 * course with its cycle progress and next class, and a way into the
 * full My Classes page. Reads the same `/api/parent/my-classes` data
 * as that page, so the two can never disagree.
 */
export default function DashboardClassesSection({ studentId = null, limit = 3 }: Props) {
  const { enrollments, loading, error } = useParentEnrollments("/api/parent/my-classes");

  const visible = enrollments
    .filter((e) => !HIDDEN_STATUSES.has(e.status))
    .filter((e) => !studentId || e.student.id === studentId)
    .sort((a, b) => {
      const first = nextClassTime(a);
      const second = nextClassTime(b);

      return first === second ? 0 : first < second ? -1 : 1;
    });

  const shown = visible.slice(0, limit);
  const toConfirm = visible.reduce((sum, e) => sum + (e.classSummary?.needsResponseCount ?? 0), 0);
  const now = new Date();

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-violet-100 text-brand flex items-center justify-center flex-shrink-0">
            <GraduationCap size={18} />
          </span>
          <h2 className="font-heading text-lg font-bold text-gray-800">My classes</h2>

          {toConfirm > 0 && (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
              {toConfirm} to confirm
            </span>
          )}
        </div>

        <Link
          href="/parent/my-classes"
          className="text-sm font-semibold text-brand hover:text-brand-dark flex items-center gap-1 flex-shrink-0"
        >
          {visible.length > shown.length ? `View all (${visible.length})` : "View all"}
          <ArrowRight size={14} />
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-violet-100 bg-violet-50/60 animate-pulse h-24"
            />
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm border border-red-100">
          We couldn&apos;t load your classes right now.
        </div>
      ) : shown.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-violet-200 rounded-3xl p-6 text-center text-sm text-gray-500">
          No classes yet — pick a course below to get your child started.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((enrollment) => {
            const ring = ringValues(enrollment);
            const next = enrollment.classSummary?.nextClass ?? null;
            const nextStart = next ? new Date(next.startsAt) : null;
            const nextToday = nextStart ? formatClassDay(nextStart, now) === "Today" : false;

            return (
              <Link
                key={enrollment.id}
                href={`/parent/my-classes/${enrollment.id}`}
                className="group flex items-center gap-4 bg-white border border-violet-100 rounded-2xl p-4 hover:border-violet-300 hover:shadow-playful transition"
              >
                {ring ? (
                  <CycleProgressRing
                    completed={ring.done}
                    total={ring.total}
                    size={52}
                    strokeWidth={5}
                  />
                ) : (
                  <span className="w-[52px] h-[52px] rounded-full bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                    <Clock size={20} />
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <p className="font-heading text-sm font-bold text-gray-800 truncate">
                    {enrollment.course.courseTitle ?? "Untitled course"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {displayName(enrollment.teacher)} · {displayName(enrollment.student)}
                  </p>

                  {nextStart ? (
                    <p
                      className={`text-[11px] font-semibold mt-1 truncate ${
                        nextToday ? "text-amber-700" : "text-brand"
                      }`}
                    >
                      Next: {formatClassDay(nextStart, now)} · {formatPlatformTime(nextStart)}
                    </p>
                  ) : ring ? (
                    <p className="text-[11px] text-gray-400 mt-1 truncate">
                      {formatSchedule(enrollment.scheduleDays, enrollment.scheduleTime)}
                    </p>
                  ) : (
                    <span
                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${getEnrollmentStatusStyle(
                        enrollment.status,
                      )}`}
                    >
                      {getEnrollmentStatusLabel(enrollment.status, "parent")}
                    </span>
                  )}
                </div>

                <ChevronRight
                  size={16}
                  className="text-gray-300 group-hover:text-brand transition-colors flex-shrink-0"
                />
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
