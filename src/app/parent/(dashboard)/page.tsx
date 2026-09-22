"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, Sparkles, BookOpenCheck, ArrowRight } from "lucide-react";

import { useApprovedCourses } from "@/features/parent/hooks/useApprovedCourses";
import { useStudents } from "@/features/parent/hooks/useStudents";
import { useParentCalendar } from "@/features/parent/hooks/useCalendar";
import LearnerSwitcher, {
  type LearnerFilter,
} from "@/features/parent/components/LearnerSwitcher";
import UpcomingLecturesCard from "@/features/shared/components/UpcomingLecturesCard";
import CourseThumbStrip from "@/features/shared/components/CourseThumbStrip";
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

      {/* HERO — kept to a single line of copy plus one quick link;
          this used to be two paragraphs of marketing text with no
          action attached to it. The dashboard's job is a glance +
          hand-off, not a landing-page pitch. */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand via-brand to-violet-800 p-5 sm:p-6 flex items-center gap-5 mb-8 shadow-playful">
        <div className="pointer-events-none absolute inset-0 bg-dot-pattern text-white/10" />
        <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-brand-yellow/20 blur-2xl" />

        <span className="relative hidden sm:flex w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex-shrink-0 items-center justify-center">
          <Sparkles size={24} className="text-brand-yellow" />
        </span>

        <div className="relative flex-1 min-w-0">
          <h1 className="font-heading text-lg sm:text-2xl font-bold text-white leading-snug truncate">
            Personalized one-on-one learning, tailored to each child
          </h1>
        </div>

        <Link
          href="/parent/courses"
          className="relative flex-shrink-0 inline-flex items-center gap-1.5 bg-brand-yellow text-violet-900 text-sm font-bold px-4 py-2.5 rounded-full shadow-playful hover:brightness-95 transition"
        >
          Browse courses
          <ArrowRight size={15} />
        </Link>
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

      {/* ACTIVE COURSES — poster-style strip; full course details
          (teacher, rating, enroll) live on /parent/courses, this is
          just a visual jumping-off point. */}
      <section>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
              <BookOpenCheck size={18} />
            </span>
            <h2 className="font-heading text-lg font-bold text-gray-800 truncate">
              {activeStudent
                ? `Courses for ${activeStudent.visibleName || activeStudent.firstName}`
                : "Active courses"}
            </h2>
          </div>
          <Link
            href="/parent/courses"
            className="text-sm font-semibold text-brand hover:text-brand-dark flex items-center gap-1 flex-shrink-0"
          >
            View all
            <ArrowRight size={14} />
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-6 border border-red-100">
            {error}
          </div>
        )}

        <CourseThumbStrip
          loading={loading}
          emptyMessage="No courses are available yet. Check back once teachers have published courses and Admin has approved them."
          courses={courses.map((course) => ({
            id: course.id,
            href: `/parent/courses/${course.id}`,
            title: course.courseTitle || "Untitled Course",
            subject: course.subject,
            price: course.price ? `₹${course.price}/mo` : null,
            thumbnailUrl: course.thumbnailUrl,
            badge: course.subject
              ? { label: course.subject, className: "bg-white/90 text-gray-800" }
              : null,
          }))}
        />
      </section>
    </div>
  );
}
