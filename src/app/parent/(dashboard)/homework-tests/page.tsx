"use client";

import Link from "next/link";
import { ClipboardCheck, ChevronRight } from "lucide-react";

import { useParentEnrollments } from "@/features/parent/hooks/useEnrollments";
import { ACTIVE_ENROLLMENT_STATUSES } from "@/features/shared/utils/enrollmentStatus";
import ErrorBanner from "@/features/shared/components/ErrorBanner";
import { displayName } from "@/features/shared/utils/displayName";

/**
 * "Home works/tests" sidebar entry — previously pointed at
 * /parent/homework-tests with no page behind it. Homework itself is
 * scoped per-Enrollment (see homework.service.ts) and only unlocks
 * once an Enrollment is ACTIVE/LAPSED, so this page is the missing
 * "pick which enrollment" list that hands off to the existing
 * per-enrollment homework view at
 * /parent/enrollments/[enrollmentId]/homework.
 */
export default function ParentHomeworkTestsPage() {
  const { enrollments, loading, error } = useParentEnrollments();

  const activeEnrollments = enrollments.filter((e) =>
    ACTIVE_ENROLLMENT_STATUSES.has(e.status),
  );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-violet-900">Home works/tests</h1>
        <p className="text-gray-500 mt-1">
          Pick an enrollment to view assignments and submit your child&apos;s work.
        </p>
      </div>

      {error && (
        <ErrorBanner>{error}</ErrorBanner>
      )}

      {loading ? (
        <p className="text-gray-500">Loading your enrollments…</p>
      ) : activeEnrollments.length === 0 ? (
        <div className="bg-white border border-violet-100 rounded-2xl p-8 text-center">
          <p className="text-gray-500">
            Homework unlocks once an enrollment is active. You don&apos;t have any
            active enrollments yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeEnrollments.map((enrollment) => (
            <Link
              key={enrollment.id}
              href={`/parent/enrollments/${enrollment.id}/homework`}
              className="flex items-center justify-between gap-3 bg-white border border-violet-100 rounded-2xl p-5 hover:border-violet-300 hover:shadow-playful transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-9 h-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center flex-shrink-0">
                  <ClipboardCheck size={16} strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <p className="font-heading font-bold text-gray-800 truncate">
                    {enrollment.course.courseTitle ?? "Untitled course"}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {displayName(enrollment.student)} &middot;{" "}
                    {displayName(enrollment.teacher)}
                  </p>
                </div>
              </div>
              <ChevronRight size={18} className="text-gray-400 flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
