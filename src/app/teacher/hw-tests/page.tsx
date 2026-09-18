"use client";

import Link from "next/link";
import { ClipboardCheck, ChevronRight } from "lucide-react";

import { useTeacherEnrollments } from "@/features/teacher/hooks/useEnrollments";
import { ACTIVE_ENROLLMENT_STATUSES } from "@/features/shared/utils/enrollmentStatus";

/**
 * "HW & Tests" sidebar entry — previously pointed at /teacher/hw-tests
 * with no page behind it (dead link). Homework itself is scoped per
 * Enrollment (see homework.service.ts, TeacherHomeworkPanel) and only
 * unlocks once an Enrollment is ACTIVE/LAPSED, exactly like the
 * Parent side. This page is the missing "pick which enrollment" list
 * that hands off to the existing per-enrollment homework view at
 * /teacher/enrollments/[enrollmentId]/homework — mirrors
 * /parent/homework-tests/page.tsx.
 */
export default function TeacherHomeworkTestsPage() {
  const { enrollments, loading, error } = useTeacherEnrollments();

  const activeEnrollments = enrollments.filter((e) =>
    ACTIVE_ENROLLMENT_STATUSES.has(e.status),
  );

  function displayName(p: { firstName: string; lastName?: string; visibleName?: string | null }) {
    return p.visibleName?.trim() || `${p.firstName} ${p.lastName ?? ""}`.trim();
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-wider text-brand">
          HW &amp; Tests
        </p>
        <h1 className="font-heading text-xl sm:text-2xl font-bold text-gray-800 mt-1">
          Homework &amp; tests
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Pick an enrollment to assign homework and review submissions.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-6 text-sm border border-red-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-violet-50 animate-pulse" />
          ))}
        </div>
      ) : activeEnrollments.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-violet-200 rounded-3xl p-8 text-center">
          <p className="text-gray-500">
            Homework unlocks once an enrollment is active. You don&apos;t have
            any active enrollments yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeEnrollments.map((enrollment) => (
            <Link
              key={enrollment.id}
              href={`/teacher/enrollments/${enrollment.id}/homework`}
              className="flex items-center justify-between gap-3 bg-white border border-violet-100 rounded-2xl p-5 hover:border-violet-300 hover:shadow-playful transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-9 h-9 rounded-xl bg-violet-100 text-brand flex items-center justify-center flex-shrink-0">
                  <ClipboardCheck size={16} strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <p className="font-heading font-bold text-gray-800 truncate">
                    {enrollment.course.courseTitle || enrollment.course.subject || "Course"}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {displayName(enrollment.student)} &middot;{" "}
                    {displayName(enrollment.parent)}
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
