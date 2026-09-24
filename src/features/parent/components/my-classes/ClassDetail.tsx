"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, CalendarClock, FolderOpen, MessageCircle } from "lucide-react";

import { useClassDetail } from "@/features/parent/hooks/useClassDetail";
import type { ClassTab } from "@/features/parent/utils/classView";
import ParentHomeworkPanel from "@/features/parent/components/homework/ParentHomeworkPanel";
import ParentResourcePanel from "@/features/parent/components/resources/ParentResourcePanel";
import RenewalPanel from "@/features/parent/components/enrollments/RenewalPanel";
import ClassHeader from "@/features/parent/components/my-classes/ClassHeader";
import CycleProgressCard from "@/features/parent/components/my-classes/CycleProgressCard";
import NextSessionCard from "@/features/parent/components/my-classes/NextSessionCard";
import UpcomingSessionsList from "@/features/parent/components/my-classes/UpcomingSessionsList";
import SessionHistoryList from "@/features/parent/components/my-classes/SessionHistoryList";
import ClassChatPanel from "@/features/parent/components/my-classes/ClassChatPanel";
import ErrorBanner from "@/features/shared/components/ErrorBanner";

interface Props {
  enrollmentId: string;
  initialTab: ClassTab;
}

const TABS: { id: ClassTab; label: string; icon: typeof CalendarClock }[] = [
  { id: "classes", label: "Classes", icon: CalendarClock },
  { id: "homework", label: "Homework", icon: BookOpen },
  { id: "resources", label: "Resources", icon: FolderOpen },
  { id: "chat", label: "Chat", icon: MessageCircle },
];

/**
 * One enrolled course's page (Part 2C) for a cycle-model enrollment:
 * course and teacher info, cycle progress, the Join button for the
 * next class, session history — with Homework, the Resource Library
 * and Chat built in as tabs, and the parent's "All good" / "Report a
 * problem" (Part 2A) and Renew in the last week (Part 2B) right on
 * the Classes tab. Everything comes from the real cycle and session
 * data. Resources (Sep 24, 2026) stays open even once the enrollment
 * has `ended`, unlike Homework — resources are permanent once shared.
 */
export default function ClassDetail({ enrollmentId, initialTab }: Props) {
  const { detail, loading, error, reload } = useClassDetail(enrollmentId);
  const [tab, setTab] = useState<ClassTab>(initialTab);

  const backLink = (
    <Link
      href="/parent/my-classes"
      className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
    >
      <ArrowLeft size={14} /> Back to My Classes
    </Link>
  );

  if (loading && !detail) {
    return (
      <div>
        {backLink}
        <p className="text-gray-500">Loading your class…</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div>
        {backLink}
        <ErrorBanner>{error || "This class couldn't be loaded."}</ErrorBanner>
      </div>
    );
  }

  const { enrollment, progress, upcoming, history, needsResponseCount } = detail;
  const next = upcoming[0] ?? null;
  const ended = enrollment.status === "COMPLETED";

  const nextLabel = next
    ? `${
        progress && progress.nextSessionNumber !== null && next.cycleNumber === progress.cycleNumber
          ? `Session ${progress.nextSessionNumber} of ${progress.sessionCount}`
          : "Class"
      }${next.isMakeup ? " · Make-up" : ""}`
    : "";

  return (
    <div>
      {backLink}

      <ClassHeader enrollment={enrollment} />

      <div
        className="inline-flex flex-wrap gap-1 p-1 mt-5 mb-5 bg-white border border-violet-100 rounded-full"
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
                ? "bg-brand text-white shadow-playful"
                : "text-gray-500 hover:text-brand hover:bg-violet-50"
            }`}
          >
            <Icon size={15} />
            {label}
            {id === "classes" && needsResponseCount > 0 && (
              <span className="text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5">
                {needsResponseCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "classes" && (
        <div className="space-y-5">
          {needsResponseCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-800">
              {needsResponseCount} class{needsResponseCount === 1 ? "" : "es"} waiting for your answer
              below — tap <span className="font-semibold">All good</span> or{" "}
              <span className="font-semibold">Report a problem</span>. If you do nothing, a class is
              accepted automatically after 48 hours.
            </div>
          )}

          {/* On a wide screen: the next class and the history on the left,
              cycle progress + renewal on the right. On a phone the order
              is simply next class → progress → the rest. */}
          <div className="grid gap-5 lg:grid-cols-3 items-start">
            <div className="lg:col-span-2">
              {next ? (
                <NextSessionCard key={next.id} sessionId={next.id} label={nextLabel} onChanged={reload} />
              ) : (
                <div className="bg-white border-2 border-dashed border-violet-200 rounded-3xl p-6 text-sm text-gray-500 text-center">
                  {ended
                    ? "This enrollment has ended. Enroll again to keep learning with this teacher."
                    : "No upcoming classes are scheduled right now."}
                </div>
              )}
            </div>

            <div className="space-y-5 lg:col-start-3 lg:row-start-1 lg:row-span-2">
              <CycleProgressCard progress={progress} />

              {enrollment.status === "ACTIVE" && (
                <RenewalPanel enrollmentId={enrollment.id} onRenewed={reload} />
              )}
            </div>

            <div className="lg:col-span-2 space-y-6">
              <UpcomingSessionsList sessions={upcoming.slice(1)} />

              <SessionHistoryList sessions={history} onChanged={reload} />
            </div>
          </div>
        </div>
      )}

      {tab === "homework" &&
        (ended ? (
          <div className="bg-white border border-violet-100 rounded-2xl p-6 text-center">
            <p className="text-sm text-gray-500">
              Homework closes once an enrollment has ended.
            </p>
          </div>
        ) : (
          <div className="max-w-3xl">
            <ParentHomeworkPanel enrollmentId={enrollment.id} />
          </div>
        ))}

      {tab === "resources" && (
        <div className="max-w-3xl">
          <ParentResourcePanel enrollmentId={enrollment.id} />
        </div>
      )}

      {tab === "chat" &&
        (enrollment.chatRoomId ? (
          <div className="max-w-3xl">
            <ClassChatPanel
              roomId={enrollment.chatRoomId}
              teacherName={enrollment.teacher.name}
              courseTitle={enrollment.courseTitle}
              enrollmentStatus={enrollment.status}
            />
          </div>
        ) : (
          <div className="bg-white border border-violet-100 rounded-2xl p-6 text-center">
            <p className="text-sm text-gray-500">
              Chat isn&apos;t available for this enrollment yet.
            </p>
          </div>
        ))}
    </div>
  );
}
