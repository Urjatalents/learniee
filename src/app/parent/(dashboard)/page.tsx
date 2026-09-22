"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, Info, Sparkles, BookOpenCheck, ArrowRight } from "lucide-react";

import { useApprovedCourses } from "@/features/parent/hooks/useApprovedCourses";
import { useStudents } from "@/features/parent/hooks/useStudents";
import { useParentCalendar } from "@/features/parent/hooks/useCalendar";
import CourseCard from "@/features/parent/components/CourseCard";
import LearnerSwitcher, {
  type LearnerFilter,
} from "@/features/parent/components/LearnerSwitcher";
import UpcomingLecturesCard from "@/features/shared/components/UpcomingLecturesCard";
import DashboardClassesSection from "@/features/parent/components/my-classes/DashboardClassesSection";

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function ParentHome() {
  const { courses, loading, error } = useApprovedCourses();
  const {
    students,
    loading: studentsLoading,
    error: studentsError,
  } = useStudents();
  const { occurrences, loading: occurrencesLoading } = useParentCalendar(
    currentMonthKey(),
  );

  const [activeLearner, setActiveLearner] = useState<LearnerFilter>("all");

  // If the currently-selected child gets removed elsewhere, the id
  // simply won't match anyone in `students` anymore - activeStudent
  // falls back to null and the page renders the "All" view without
  // needing to force-reset the switcher's own selection state.
  const activeStudent =
    activeLearner === "all"
      ? null
      : students.find((s) => s.id === activeLearner) ?? null;

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm font-bold uppercase tracking-wider text-brand">
          Home
        </p>
      </div>

      {/* LEARNER SWITCHER — highlighted card directly below the
          navbar; this is now the only "Your Children" surface on
          the dashboard, replacing the old center-page grid/focus
          card (see LearnerSwitcher.tsx). Always rendered (even
          while loading or with zero children) so "Add a learner"
          is reachable no matter what. */}
      <LearnerSwitcher
        students={students}
        active={activeLearner}
        onSelect={setActiveLearner}
        loading={studentsLoading}
      />

      {studentsError && (
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-8 text-sm border border-red-100">
          {studentsError}
        </div>
      )}

      {/* HERO */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand via-brand to-violet-800 p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6 mb-10 shadow-playful">
        {/* Decorative dotted texture, kept subtle so it reads as
            "playful pattern" rather than clutter behind the copy */}
        <div className="pointer-events-none absolute inset-0 bg-dot-pattern text-white/10" />
        <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-brand-yellow/20 blur-2xl" />

        <div className="relative flex-1">
          <span className="inline-flex items-center gap-1.5 bg-white/15 text-white text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full mb-3">
            <Sparkles size={13} className="text-brand-yellow" />
            One-on-one learning
          </span>

          <h1 className="font-heading text-xl sm:text-3xl font-bold text-white leading-snug">
            Unlock the power of personalized learning, tailored just for
            your child
          </h1>

          <p className="text-sm text-white/85 mt-3 max-w-lg">
            Personalized one-on-one academic classes with budget-friendly
            options and top faculty guidance — built around how your
            child actually learns.
          </p>

          <p className="text-sm text-white/85 mt-2 max-w-lg">
            Invest in their future today and start a transformative
            learning journey now.
          </p>
        </div>

        <div className="relative w-full md:w-56 h-40 rounded-2xl bg-white/10 border border-white/20 flex-shrink-0 flex items-center justify-center">
          <BookOpenCheck size={56} className="text-white/70" strokeWidth={1.3} />
        </div>
      </div>

      {/* TODAY & UPCOMING LECTURES */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0">
              <CalendarClock size={18} />
            </span>
            <h2 className="font-heading text-lg font-bold text-gray-800">
              Today &amp; upcoming lectures
            </h2>
          </div>
          <Link
            href="/parent/calendar"
            className="text-sm font-semibold text-brand hover:text-brand-dark flex items-center gap-1"
          >
            Full calendar
            <ArrowRight size={14} />
          </Link>
        </div>

        <UpcomingLecturesCard
          occurrences={occurrences}
          loading={occurrencesLoading}
          role="parent"
        />
      </section>

      {/* MY CLASSES — a glance at each running course; the full page
          (progress, history, homework, chat) is /parent/my-classes. */}
      <DashboardClassesSection studentId={activeStudent?.id ?? null} />

      {/* ACTIVE COURSES */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <span className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
            <BookOpenCheck size={18} />
          </span>
          <h2 className="font-heading text-lg font-bold text-gray-800">
            {activeStudent
              ? `Courses for ${activeStudent.visibleName || activeStudent.firstName}`
              : "Active courses"}
          </h2>
        </div>

        {/* Enrollment isn't modeled yet (03-DATA-MODEL.md), so
            there's no real link between a Student and a course
            they're taking. The switcher can't filter courses by
            child until that exists - be upfront about that here
            instead of implying a filter that isn't really happening. */}
        {activeStudent && (
          <div className="flex items-start gap-2 bg-sky-50 text-sky-700 text-sm rounded-2xl p-3 mb-4 border border-sky-100">
            <Info size={16} className="flex-shrink-0 mt-0.5" />
            <span>
              Course enrollment isn&apos;t linked to a specific child yet, so
              this shows everything available — once enrollment is live,
              this list will scope to what {activeStudent.visibleName || activeStudent.firstName} is actually taking.
            </span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-6 border border-red-100">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="rounded-3xl border border-violet-100 bg-violet-50/60 animate-pulse min-h-[19rem]"
              />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-violet-200 rounded-3xl p-8 text-center">
            <p className="text-gray-500">
              No courses are available yet. Check back once teachers have
              published courses and Admin has approved them.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {courses.map((course) => (
              <Link key={course.id} href={`/parent/courses/${course.id}`}>
                <CourseCard course={course} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
