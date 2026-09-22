"use client";

import Link from "next/link";
import { GraduationCap, Radio, Users } from "lucide-react";

import { useTeacherClasses } from "@/features/teacher/hooks/useMyClasses";
import { formatClassDay } from "@/features/shared/utils/classTimeLabels";
import { formatPlatformTime } from "@/lib/platformTime";
import ErrorBanner from "@/features/shared/components/ErrorBanner";

/**
 * Teacher's "My Classes": one card per course with students enrolled
 * in it. Opening a card ("Classes live") shows the roster of
 * students, and from there each student's classes, homework and
 * chat — the Teacher-side mirror of the Parent's My Classes page
 * (Part 2C), organized by class instead of by one enrollment since a
 * Teacher's course usually has several students in it.
 */
export default function TeacherMyClassesPage() {
  const { classes, loading, error } = useTeacherClasses();

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="flex items-start gap-3 mb-6">
        <span className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0">
          <GraduationCap size={22} />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-purple-600">My Classes</h1>
          <p className="text-sm text-gray-500 mt-0.5 max-w-xl">
            Every course you teach, with the students enrolled in it — open one to see who&apos;s
            in it and jump straight to their classes, homework or chat.
          </p>
        </div>
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-purple-100 bg-purple-50/60 animate-pulse h-36" />
          ))}
        </div>
      ) : classes.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-purple-200 rounded-2xl p-10 text-center">
          <span className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto mb-3">
            <GraduationCap size={26} />
          </span>
          <p className="font-bold text-gray-800">No classes yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Once a student enrolls in one of your courses, it shows up here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {classes.map((klass) => {
            const next = klass.nextSessionAt ? new Date(klass.nextSessionAt) : null;

            return (
              <Link
                key={klass.courseId}
                href={`/teacher/my-classes/${klass.courseId}`}
                className="bg-white border border-purple-100 rounded-2xl p-5 hover:border-purple-300 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-bold text-gray-800 truncate">
                      {klass.courseTitle ?? "Untitled course"}
                    </h2>
                    {klass.subject && <p className="text-xs text-gray-400">{klass.subject}</p>}
                  </div>

                  {klass.liveNowCount > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 rounded-full px-2 py-1 flex-shrink-0">
                      <Radio size={11} className="animate-pulse" />
                      {klass.liveNowCount} live
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-3">
                  <Users size={13} />
                  {klass.studentCount} student{klass.studentCount === 1 ? "" : "s"}
                  {klass.activeStudentCount > 0 && klass.activeStudentCount !== klass.studentCount && (
                    <span className="text-gray-400">· {klass.activeStudentCount} active</span>
                  )}
                </div>

                <p className="text-xs text-gray-400 mt-2">
                  {next
                    ? `Next class ${formatClassDay(next)} · ${formatPlatformTime(next)}`
                    : "No upcoming class scheduled"}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
