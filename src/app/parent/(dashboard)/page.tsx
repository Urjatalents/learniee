"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  Info,
  Sparkles,
  BookOpenCheck,
  ArrowRight,
  Users,
  CalendarDays,
  Video,
} from "lucide-react";

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

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
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

  const quickStats = [
    {
      label: "Learners",
      value: studentsLoading ? "—" : students.length,
      icon: Users,
      href: "/parent/students",
    },
    {
      label: "Classes this month",
      value: occurrencesLoading ? "—" : occurrences.length,
      icon: CalendarDays,
      href: "/parent/calendar",
    },
    {
      label: "Courses available",
      value: loading ? "—" : courses.length,
      icon: BookOpenCheck,
      href: "/parent/courses",
    },
  ];

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
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-400 via-brand to-violet-700 p-6 sm:p-10 flex flex-col md:flex-row items-center gap-8 mb-8 shadow-playful">
        {/* Decorative dotted texture + layered glow orbs, kept
            subtle so it reads as "polished panel" rather than
            clutter behind the copy */}
        <div className="pointer-events-none absolute inset-0 bg-dot-pattern text-white/10" />
        <div className="pointer-events-none absolute -top-16 -right-10 w-56 h-56 rounded-full bg-brand-yellow/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 w-64 h-64 rounded-full bg-white/10 blur-3xl" />

        <div className="relative flex-1">
          <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full mb-4 ring-1 ring-white/20">
            <Sparkles size={13} className="text-brand-yellow" />
            One-on-one learning
          </span>

          <p className="text-white/70 text-sm font-semibold mb-1.5">
            {greeting()}
          </p>

          <h1 className="font-heading text-2xl sm:text-4xl font-bold text-white leading-tight">
            Unlock the power of personalized learning, tailored just
            for your child
          </h1>

          <p className="text-sm text-white/80 mt-4 max-w-lg leading-relaxed">
            Personalized one-on-one academic classes with budget-friendly
            options and top faculty guidance — built around how your
            child actually learns.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-6">
            <Link
              href="/parent/free-demo"
              className="inline-flex items-center gap-2 bg-brand-yellow text-violet-950 text-sm font-bold px-4 py-2.5 rounded-full shadow-playful hover:brightness-95 transition"
            >
              <Video size={16} />
              Book a free demo
            </Link>
            <Link
              href="/parent/courses"
              className="inline-flex items-center gap-2 bg-white/10 text-white text-sm font-bold px-4 py-2.5 rounded-full ring-1 ring-white/25 hover:bg-white/15 transition"
            >
              Browse courses
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        <div className="relative w-full md:w-56 h-44 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20 flex-shrink-0 flex items-center justify-center shadow-inner">
          <BookOpenCheck size={56} className="text-white/70" strokeWidth={1.3} />
        </div>
      </div>

      {/* QUICK STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {quickStats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group relative overflow-hidden bg-white rounded-2xl border border-violet-100 p-4 flex items-center gap-4 shadow-sm hover:shadow-playful hover:border-violet-200 hover:-translate-y-0.5 transition"
          >
            <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-brand text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <stat.icon size={19} />
            </span>
            <div>
              <span className="font-heading text-2xl font-bold text-gray-800 block leading-none">
                {stat.value}
              </span>
              <span className="text-xs text-gray-500 leading-snug">{stat.label}</span>
            </div>
            <ArrowRight
              size={15}
              className="ml-auto text-violet-300 group-hover:text-brand group-hover:translate-x-0.5 transition"
            />
          </Link>
        ))}
      </div>

      {/* TODAY & UPCOMING LECTURES */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-violet-100">
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
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-violet-100">
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
          <div className="bg-white border-2 border-dashed border-violet-200 rounded-[1.75rem] p-8 text-center">
            <p className="text-gray-500">
              No courses are available yet. Check back once teachers have
              published courses and Admin has approved them.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/parent/courses/${course.id}`}
                className="group block rounded-[1.75rem] transition hover:-translate-y-1"
              >
                <CourseCard course={course} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
