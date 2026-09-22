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
import CourseThumbStrip from "@/features/shared/components/CourseThumbStrip";

interface TeacherProfile {
  firstName: string;
  lastName: string;
  visibleName: string | null;
}

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const COURSE_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  APPROVED: { label: "Approved", className: "bg-green-100 text-green-700" },
  UNDER_REVIEW: { label: "Under review", className: "bg-amber-100 text-amber-700" },
  REJECTED: { label: "Rejected", className: "bg-red-100 text-red-700" },
};

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

      {/* HERO — one line + the CTA, no separate marketing paragraph.
          Quick stats right below already carry the "what needs
          attention today" info visually. */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand via-brand to-violet-800 p-5 sm:p-6 flex items-center gap-5 mb-8 shadow-playful">
        <div className="pointer-events-none absolute inset-0 bg-dot-pattern text-white/10" />
        <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-brand-yellow/20 blur-2xl" />

        <span className="relative hidden sm:flex w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex-shrink-0 items-center justify-center">
          <Sparkles size={24} className="text-brand-yellow" />
        </span>

        <div className="relative flex-1 min-w-0">
          <h1 className="font-heading text-lg sm:text-2xl font-bold text-white leading-snug truncate">
            Welcome back{teacherName ? `, ${teacherName}` : ""}
          </h1>
        </div>

        <Link
          href="/teacher/course-management/new"
          className="relative flex-shrink-0 inline-flex items-center gap-1.5 bg-brand-yellow text-violet-900 text-sm font-bold px-4 py-2.5 rounded-full shadow-playful hover:brightness-95 transition"
        >
          <Plus size={16} />
          New course
        </Link>
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
            {needsAction.slice(0, 4).map((e) => {
              const studentLabel = e.student.visibleName || e.student.firstName;
              const initial = (studentLabel || "S").trim().charAt(0).toUpperCase();

              return (
                <Link
                  key={e.id}
                  href="/teacher/enrollments"
                  className="flex items-center gap-3 bg-white rounded-2xl border border-violet-100 p-4 hover:border-violet-200 hover:shadow-playful transition"
                >
                  <span className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-brand flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                    {initial}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-gray-800 text-sm truncate">
                        {studentLabel}
                      </span>
                      <span
                        className={`flex-shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full ${getEnrollmentStatusStyle(
                          e.status,
                        )}`}
                      >
                        {getEnrollmentStatusLabel(e.status, "teacher")}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {e.course.courseTitle || e.course.subject || "Course"}
                    </p>
                  </div>
                </Link>
              );
            })}
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

      {/* YOUR COURSES — poster-style strip; full detail (status,
          modules, price editing) stays on Course Management. */}
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

        <CourseThumbStrip
          loading={coursesLoading}
          emptyMessage="You haven't created any courses yet."
          emptyAction={{ label: "Create your first course", href: "/teacher/course-management/new" }}
          courses={courses.slice(0, 8).map((course) => ({
            id: course.id,
            href: "/teacher/course-management",
            title: course.courseTitle || "Untitled course",
            subject: course.subject,
            price: course.price ? `₹${course.price}` : null,
            badge: COURSE_STATUS_BADGE[course.status ?? ""] ?? {
              label: "Draft",
              className: "bg-gray-100 text-gray-600",
            },
          }))}
        />
      </section>
    </div>
  );
}
