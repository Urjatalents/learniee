"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, ChevronRight, MessageCircle, Radio } from "lucide-react";

import { useTeacherClassRoster } from "@/features/teacher/hooks/useMyClasses";
import { getEnrollmentStatusLabel, getEnrollmentStatusStyle } from "@/features/shared/utils/enrollmentStatus";
import { formatClassDay } from "@/features/shared/utils/classTimeLabels";
import { formatPlatformTime } from "@/lib/platformTime";
import ErrorBanner from "@/features/shared/components/ErrorBanner";

/**
 * "Classes live" — the roster of students enrolled in one of the
 * Teacher's courses, each with where their cycle stands and
 * shortcuts to chat / homework, and a link into their full class
 * page (progress, upcoming classes, history).
 */
export default function TeacherClassRosterPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = use(params);
  const { roster, loading, error } = useTeacherClassRoster(courseId);

  const backLink = (
    <Link
      href="/teacher/my-classes"
      className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
    >
      <ArrowLeft size={14} /> Back to My Classes
    </Link>
  );

  if (loading && !roster) {
    return (
      <div className="p-4 sm:p-8 max-w-4xl mx-auto">
        {backLink}
        <p className="text-gray-500">Loading this class…</p>
      </div>
    );
  }

  if (!roster) {
    return (
      <div className="p-4 sm:p-8 max-w-4xl mx-auto">
        {backLink}
        <ErrorBanner>{error || "This class couldn't be loaded."}</ErrorBanner>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      {backLink}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-purple-600">
          {roster.course.title ?? "Untitled course"}
        </h1>
        {roster.course.subject && <p className="text-sm text-gray-500 mt-0.5">{roster.course.subject}</p>}
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <div className="space-y-3">
        {roster.students.map((student) => {
          const style = getEnrollmentStatusStyle(student.status);
          const label = getEnrollmentStatusLabel(student.status, "teacher");
          const next = student.classSummary?.nextClass;

          return (
            <div
              key={student.enrollmentId}
              className="bg-white border border-purple-100 rounded-2xl px-4 py-3.5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-gray-800 truncate">{student.studentName}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${style}`}>
                      {label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">Parent: {student.parentName}</p>

                  {student.classSummary?.progress && (
                    <p className="text-xs text-gray-400 mt-1">
                      {student.classSummary.progress.countedSessions} of{" "}
                      {student.classSummary.progress.sessionCount} classes held this cycle
                    </p>
                  )}

                  {next && (
                    <p className="text-xs text-purple-700 font-semibold mt-1 flex items-center gap-1">
                      <Radio size={11} />
                      Next: {formatClassDay(new Date(next.startsAt))} ·{" "}
                      {formatPlatformTime(new Date(next.startsAt))}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {student.chatRoomId && (
                    <Link
                      href={`/teacher/chat/${student.chatRoomId}`}
                      title="Open chat"
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-purple-50 hover:bg-purple-100 text-purple-700"
                    >
                      <MessageCircle size={13} />
                    </Link>
                  )}
                  <Link
                    href={`/teacher/enrollments/${student.enrollmentId}/homework`}
                    title="Homework"
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-purple-50 hover:bg-purple-100 text-purple-700"
                  >
                    <BookOpen size={13} />
                  </Link>
                  <Link
                    href={`/teacher/my-classes/${courseId}/${student.enrollmentId}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap"
                  >
                    View classes
                    <ChevronRight size={13} />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
