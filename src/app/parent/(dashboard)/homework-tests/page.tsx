"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { useParentEnrollments } from "@/features/parent/hooks/useEnrollments";
import { displayName } from "@/features/chat/types/chat";
import {
  getEnrollmentStatusLabel,
  getEnrollmentStatusStyle,
} from "@/features/shared/utils/enrollmentStatus";
import ErrorBanner from "@/features/shared/components/ErrorBanner";

// Enrollments that can have homework: running or finished ones.
const HOMEWORK_STATUSES = new Set(["ACTIVE", "COMPLETED", "LAPSED"]);

export default function ParentHomeworkTestsPage() {
  const { enrollments, loading, error } = useParentEnrollments();
  const list = enrollments.filter((e) => HOMEWORK_STATUSES.has(e.status));

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-violet-900">Homework</h1>
        <p className="text-gray-500 mt-1">
          Pick a course to see and submit your child&apos;s homework.
        </p>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : error ? (
        <ErrorBanner spacing={false}>{error}</ErrorBanner>
      ) : list.length === 0 ? (
        <div className="bg-white border rounded-xl p-8 text-center">
          <p className="text-gray-500">
            No homework yet — it appears here once a class is active.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((e) => (
            <Link
              key={e.id}
              href={`/parent/enrollments/${e.id}/homework`}
              className="bg-white border rounded-xl p-4 hover:border-purple-300 hover:shadow-sm transition flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <p className="font-semibold text-gray-800 truncate">
                  {e.course.courseTitle ?? "Untitled course"}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  {displayName(e.student)} · {displayName(e.teacher)}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${getEnrollmentStatusStyle(e.status)}`}
                >
                  {getEnrollmentStatusLabel(e.status, "parent")}
                </span>
                <ChevronRight size={16} className="text-gray-400" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
