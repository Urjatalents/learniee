"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  BookOpenCheck,
  ListChecks,
  Users,
  CalendarDays,
  Plus,
  ArrowRight,
} from "lucide-react";

import { useTeacherCourses } from "@/features/courses/hooks/useTeacherCourses";
import { useTeacherEnrollments } from "@/features/teacher/hooks/useEnrollments";
import { useTeacherCalendar } from "@/features/teacher/hooks/useCalendar";
import {
  getEnrollmentStatusLabel,
  getEnrollmentStatusStyle,
} from "@/features/shared/utils/enrollmentStatus";
import UpcomingLecturesCard from "@/features/shared/components/UpcomingLecturesCard";

interface TeacherProfile {
  firstName: string;
  lastName: string;
  visibleName: string | null;
}

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function TeacherDashboard() {
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);

  useEffect(() => {
    async function fetchTeacher() {
      try {
        const res = await fetch("/api/teacher/profile");
        if (!res.ok) return;
        const data = await res.json();
        setTeacher(data.teacher);
      } catch (err) {
        console.error("Failed to load teacher:", err);
      }
    }
    fetchTeacher();
  }, []);

  const teacherName =
    teacher?.visibleName || `${teacher?.firstName ?? ""} ${teacher?.lastName ?? ""}`.trim();

  const { courses, loading: coursesLoading } = useTeacherCourses();
  const {
    enrollments,
    loading: enrollmentsLoading,
    error: enrollmentsError,
  } = useTeacherEnrollments();
  const { occurrences, loading: occurrencesLoading } = useTeacherCalendar(
    currentMonthKey(),
  );

  // Enrollments genuinely waiting on this teacher right now — the
  // dashboard's "needs your action" queue, same data source as
  // /teacher/enrollments so counts never drift between the two.
  const needsAction = useMemo(
    () => enrollments.filter((e) => e.status === "PENDING_TEACHER_APPROVAL"),
    [enrollments],
  );

  const activeEnrollments = useMemo(
    () => enrollments.filter((e) => e.status === "ACTIVE" || e.status === "LAPSED"),
    [enrollments],
  );

  const studentCount = useMemo(() => {
    const ids = new Set(activeEnrollments.map((e) => e.student.id));
    return ids.size;
  }, [activeEnrollments]);

  const publishedCourses = courses.filter((c) => c.status === "APPROVED");

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm font-bold uppercase tracking-wider text-brand">Home</p>
      </div>

      {/* HERO */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand via-brand to-violet-800 p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6 mb-8 shadow-playful">
        <div className="pointer-events-none absolute inset-0 bg-dot-pattern text-white/10" />
        <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-brand-yellow/20 blur-2xl" />

        <div className="relative flex-1">
          <span className="inline-flex items-center gap-1.5 bg-white/15 text-white text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full mb-3">
            <Sparkles size={13} className="text-brand-yellow" />
            Teacher dashboard
          </span>

          <h1 className="font-heading text-xl sm:text-3xl font-bold text-white leading-snug">
            Welcome back{teacherName ? `, ${teacherName}` : ""}
          </h1>

          <p className="text-sm text-white/85 mt-3 max-w-lg">
            Here&apos;s what needs your attention today — new enrollments to
            review, your upcoming classes, and how your courses are doing.
          </p>

          <Link
            href="/teacher/course-management/new"
            className="inline-flex items-center gap-2 mt-5 bg-brand-yellow text-violet-900 text-sm font-bold px-4 py-2.5 rounded-full shadow-playful hover:brightness-95 transition"
          >
            <Plus size={16} />
            Create a new course
          </Link>
        </div>

        <div className="relative w-full md:w-56 h-40 rounded-2xl bg-white/10 border border-white/20 flex-shrink-0 flex items-center justify-center">
          <BookOpenCheck size={56} className="text-white/70" strokeWidth={1.3} />
        </div>
      </div>

      {/* QUICK STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {[
          {
            label: "Awaiting your review",
            value: enrollmentsLoading ? "—" : needsAction.length,
            icon: ListChecks,
            href: "/teacher/enrollments",
          },
          {
            label: "Active students",
            value: enrollmentsLoading ? "—" : studentCount,
            icon: Users,
            href: "/teacher/enrollments",
          },
          {
            label: "Classes this month",
            value: occurrencesLoading ? "—" : occurrences.length,
            icon: CalendarDays,
            href: "/teacher/calendar",
          },
          {
            label: "Published courses",
            value: coursesLoading ? "—" : publishedCourses.length,
            icon: BookOpenCheck,
            href: "/teacher/course-management",
          },
        ].map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-white rounded-2xl border border-violet-100 p-4 flex flex-col gap-2 shadow-sm hover:shadow-playful hover:border-violet-200 transition"
          >
            <span className="w-9 h-9 rounded-xl bg-violet-100 text-brand flex items-center justify-center">
              <stat.icon size={17} />
            </span>
            <span className="font-heading text-2xl font-bold text-gray-800">
              {stat.value}
            </span>
            <span className="text-xs text-gray-500 leading-snug">{stat.label}</span>
          </Link>
        ))}
      </div>

      {/* NEEDS YOUR ACTION */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
              <ListChecks size={18} />
            </span>
            <h2 className="font-heading text-lg font-bold text-gray-800">
              Needs your action
            </h2>
          </div>
          <Link
            href="/teacher/enrollments"
            className="text-sm font-semibold text-brand hover:text-brand-dark flex items-center gap-1"
          >
            View all
            <ArrowRight size={14} />
          </Link>
        </div>

        {enrollmentsError && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-4 text-sm border border-red-100">
            {enrollmentsError}
          </div>
        )}

        {enrollmentsLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[...Array(2)].map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-violet-100 bg-violet-50/60 animate-pulse h-24"
              />
            ))}
          </div>
        ) : needsAction.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-violet-200 rounded-3xl p-6 text-center text-sm text-gray-500">
            Nothing waiting on you right now — new enrollments will show up
            here as soon as a parent pays.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {needsAction.slice(0, 4).map((e) => (
              <Link
                key={e.id}
                href="/teacher/enrollments"
                className="bg-white rounded-2xl border border-violet-100 p-4 hover:border-violet-200 hover:shadow-playful transition"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-gray-800 text-sm truncate">
                    {e.student.visibleName || e.student.firstName}
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${getEnrollmentStatusStyle(
                      e.status,
                    )}`}
                  >
                    {getEnrollmentStatusLabel(e.status, "teacher")}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">
                  {e.course.courseTitle || e.course.subject || "Course"} ·{" "}
                  {e.sessionsPerMonth} sessions/month
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* UPCOMING CLASSES */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0">
              <CalendarDays size={18} />
            </span>
            <h2 className="font-heading text-lg font-bold text-gray-800">
              Today &amp; upcoming lectures
            </h2>
          </div>
          <Link
            href="/teacher/calendar"
            className="text-sm font-semibold text-brand hover:text-brand-dark flex items-center gap-1"
          >
            Full calendar
            <ArrowRight size={14} />
          </Link>
        </div>

        <UpcomingLecturesCard
          occurrences={occurrences}
          loading={occurrencesLoading}
          role="teacher"
        />
      </section>

      {/* YOUR COURSES */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <BookOpenCheck size={18} />
            </span>
            <h2 className="font-heading text-lg font-bold text-gray-800">
              Your courses
            </h2>
          </div>
          <Link
            href="/teacher/course-management"
            className="text-sm font-semibold text-brand hover:text-brand-dark flex items-center gap-1"
          >
            Manage courses
            <ArrowRight size={14} />
          </Link>
        </div>

        {coursesLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="rounded-3xl border border-violet-100 bg-violet-50/60 animate-pulse min-h-[8rem]"
              />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-violet-200 rounded-3xl p-8 text-center">
            <p className="text-gray-500 mb-4">
              You haven&apos;t created any courses yet.
            </p>
            <Link
              href="/teacher/course-management/new"
              className="inline-flex items-center gap-2 bg-brand text-white text-sm font-bold px-4 py-2.5 rounded-full shadow-playful hover:bg-brand-dark transition"
            >
              <Plus size={16} />
              Create your first course
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {courses.slice(0, 8).map((course) => (
              <Link
                key={course.id}
                href="/teacher/course-management"
                className="bg-white border border-violet-100 rounded-3xl p-5 hover:border-violet-200 hover:shadow-playful transition flex flex-col"
              >
                <span
                  className={`self-start text-[11px] font-bold px-2.5 py-1 rounded-full mb-3 ${
                    course.status === "APPROVED"
                      ? "bg-green-100 text-green-700"
                      : course.status === "UNDER_REVIEW"
                        ? "bg-amber-100 text-amber-700"
                        : course.status === "REJECTED"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {course.status === "APPROVED"
                    ? "Approved"
                    : course.status === "UNDER_REVIEW"
                      ? "Under review"
                      : course.status === "REJECTED"
                        ? "Rejected"
                        : "Draft"}
                </span>
                <h3 className="font-heading font-bold text-gray-800 truncate">
                  {course.courseTitle || "Untitled course"}
                </h3>
                <p className="text-xs text-gray-500 mt-1 truncate">
                  {course.subject || "—"} {course.grade ? `· ${course.grade}` : ""}
                </p>
                <p className="text-sm font-bold text-brand mt-3">
                  {course.price ? `₹${course.price}` : "Price not set"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
