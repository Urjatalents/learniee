"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, CalendarClock, MessageCircle } from "lucide-react";

import { useTeacherStudentDetail } from "@/features/teacher/hooks/useMyClasses";
import TeacherHomeworkPanel from "@/features/teacher/components/homework/TeacherHomeworkPanel";
import TeacherClassChatPanel from "@/features/teacher/components/my-classes/TeacherClassChatPanel";
import UpcomingClassesList from "@/features/teacher/components/my-classes/UpcomingClassesList";
import ClassHistoryList from "@/features/teacher/components/my-classes/ClassHistoryList";
import CycleProgressCard from "@/features/parent/components/my-classes/CycleProgressCard";
import ErrorBanner from "@/features/shared/components/ErrorBanner";

type Tab = "classes" | "homework" | "chat";

const TABS: { id: Tab; label: string; icon: typeof CalendarClock }[] = [
  { id: "classes", label: "Classes", icon: CalendarClock },
  { id: "homework", label: "Homework", icon: BookOpen },
  { id: "chat", label: "Chat", icon: MessageCircle },
];

/**
 * One enrolled student's page under My Classes ↦ course ↦ student:
 * cycle progress and upcoming/history classes, with Homework and
 * Chat built in as tabs — the Teacher-side mirror of the Parent's
 * per-enrollment My Classes page (Part 2C), minus the Parent-only
 * confirm/report and renewal actions.
 */
export default function TeacherStudentClassesPage({
  params,
}: {
  params: Promise<{ courseId: string; enrollmentId: string }>;
}) {
  const { courseId, enrollmentId } = use(params);
  const { detail, loading, error } = useTeacherStudentDetail(courseId, enrollmentId);
  const [tab, setTab] = useState<Tab>("classes");

  const backLink = (
    <Link
      href={`/teacher/my-classes/${courseId}`}
      className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
    >
      <ArrowLeft size={14} /> Back to class
    </Link>
  );

  if (loading && !detail) {
    return (
      <div className="p-4 sm:p-8 max-w-4xl mx-auto">
        {backLink}
        <p className="text-gray-500">Loading this student&apos;s classes…</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="p-4 sm:p-8 max-w-4xl mx-auto">
        {backLink}
        <ErrorBanner>{error || "This student's classes couldn't be loaded."}</ErrorBanner>
      </div>
    );
  }

  const { enrollment, progress, upcoming, history } = detail;
  const ended = enrollment.status === "COMPLETED";

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      {backLink}

      <div className="mb-5">
        <h1 className="text-2xl font-bold text-purple-600">{enrollment.studentName}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {enrollment.courseTitle ?? "Untitled course"}
          {enrollment.subject ? ` · ${enrollment.subject}` : ""} · Parent: {enrollment.parent.name}
        </p>
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <div
        className="inline-flex flex-wrap gap-1 p-1 mb-5 bg-white border border-purple-100 rounded-full"
        role="tablist"
      >
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-full transition-colors ${
              tab === id
                ? "bg-purple-600 text-white"
                : "text-gray-500 hover:text-purple-600 hover:bg-purple-50"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {tab === "classes" && (
        <div className="grid gap-5 lg:grid-cols-3 items-start">
          <div className="lg:col-span-2 space-y-6">
            <UpcomingClassesList sessions={upcoming} />
            <ClassHistoryList sessions={history} />
          </div>

          <div className="lg:col-start-3">
            <CycleProgressCard progress={progress} />
          </div>
        </div>
      )}

      {tab === "homework" &&
        (ended ? (
          <div className="bg-white border border-purple-100 rounded-2xl p-6 text-center">
            <p className="text-sm text-gray-500">Homework closes once an enrollment has ended.</p>
          </div>
        ) : (
          <div className="max-w-3xl">
            <TeacherHomeworkPanel enrollmentId={enrollment.id} />
          </div>
        ))}

      {tab === "chat" &&
        (enrollment.chatRoomId ? (
          <div className="max-w-3xl">
            <TeacherClassChatPanel
              roomId={enrollment.chatRoomId}
              studentName={enrollment.studentName}
              courseTitle={enrollment.courseTitle}
              enrollmentStatus={enrollment.status}
            />
          </div>
        ) : (
          <div className="bg-white border border-purple-100 rounded-2xl p-6 text-center">
            <p className="text-sm text-gray-500">Chat isn&apos;t available for this student yet.</p>
          </div>
        ))}
    </div>
  );
}
