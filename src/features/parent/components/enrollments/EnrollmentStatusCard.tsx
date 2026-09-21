"use client";

import { useRouter } from "next/navigation";
import { CalendarClock, MessageCircle, BookOpen } from "lucide-react";

import type { ParentEnrollment } from "@/features/parent/hooks/useEnrollments";
import {
  getEnrollmentStatusLabel,
  getEnrollmentStatusStyle,
} from "@/features/shared/utils/enrollmentStatus";
import { formatSchedule } from "@/features/shared/utils/weekdays";
import CycleProgressRing from "@/features/shared/components/CycleProgressRing";
import RenewalPanel from "@/features/parent/components/enrollments/RenewalPanel";

interface Props {
  enrollment: ParentEnrollment;
  onConfirmRevision: (id: string) => void;
  onDeclineRevision: (id: string) => void;
}

function displayName(p: { firstName: string; lastName: string; visibleName: string | null }) {
  return p.visibleName?.trim() || `${p.firstName} ${p.lastName}`.trim();
}

export default function EnrollmentStatusCard({
  enrollment,
  onConfirmRevision,
  onDeclineRevision,
}: Props) {
  const router = useRouter();
  const label = getEnrollmentStatusLabel(enrollment.status, "parent");
  const style = getEnrollmentStatusStyle(enrollment.status);
  const needsReconfirmation = enrollment.status === "PENDING_PARENT_RECONFIRMATION";
  const showCycleProgress = enrollment.status === "ACTIVE" || enrollment.status === "LAPSED";

  return (
    <div className="bg-white border border-violet-100 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-heading font-bold text-gray-800 truncate">
            {enrollment.course.courseTitle ?? "Untitled course"}
          </p>
          <p className="text-sm text-gray-500 truncate">
            with {displayName(enrollment.teacher)} ·{" "}
            {enrollment.student.visibleName || enrollment.student.firstName}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {showCycleProgress && (
            <CycleProgressRing
              completed={enrollment.sessionsCompletedInCycle}
              total={enrollment.sessionsPerMonth}
            />
          )}
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${style}`}>
            {label}
          </span>
        </div>
      </div>

      {showCycleProgress && enrollment.cyclesCompleted > 0 && (
        <p className="text-[11px] text-gray-400 mt-1">
          {enrollment.cyclesCompleted} cycle{enrollment.cyclesCompleted === 1 ? "" : "s"} completed
        </p>
      )}

      <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
        <CalendarClock size={13} />
        {enrollment.sessionsPerMonth} sessions/month ·{" "}
        {new Date(enrollment.cycleStartDate).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}{" "}
        start
      </div>

      <p className="text-[11px] text-gray-400 mt-1">
        {formatSchedule(enrollment.scheduleDays, enrollment.scheduleTime)}
      </p>

      {needsReconfirmation && (
        <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-3">
          <p className="text-xs font-bold text-blue-800 mb-1">
            Your teacher proposed a change
          </p>
          {enrollment.revisionNote && (
            <p className="text-xs text-blue-700 mb-3">{enrollment.revisionNote}</p>
          )}
          <p className="text-[11px] text-blue-600 mb-3">
            New schedule: {enrollment.sessionsPerMonth} sessions/month, starting{" "}
            {new Date(enrollment.cycleStartDate).toLocaleDateString()}
            {" — "}
            {formatSchedule(enrollment.scheduleDays, enrollment.scheduleTime)}.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onConfirmRevision(enrollment.id)}
              className="text-xs font-bold text-white bg-brand px-3 py-1.5 rounded-full"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => onDeclineRevision(enrollment.id)}
              className="text-xs font-bold text-gray-600 bg-white border border-gray-200 px-3 py-1.5 rounded-full"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {enrollment.status === "REJECTED" && (
        <p className="text-xs text-red-600 mt-3">
          This enrollment wasn&apos;t approved. Message your teacher in chat
          for details.
        </p>
      )}

      {enrollment.status === "ACTIVE" && !enrollment.isLegacy && (
        <RenewalPanel enrollmentId={enrollment.id} />
      )}

      <div className="flex flex-wrap gap-2 mt-4">
        {enrollment.chatRoom && (
          <button
            type="button"
            onClick={() => router.push(`/parent/chat/${enrollment.chatRoom!.id}`)}
            className="flex items-center gap-2 text-xs font-bold text-brand-dark bg-violet-50 hover:bg-violet-100 px-3 py-2 rounded-full transition-colors"
          >
            <MessageCircle size={13} />
            Chat with teacher
          </button>
        )}

        {showCycleProgress && (
          <button
            type="button"
            onClick={() => router.push(`/parent/enrollments/${enrollment.id}/homework`)}
            className="flex items-center gap-2 text-xs font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 px-3 py-2 rounded-full transition-colors"
          >
            <BookOpen size={13} />
            Homework
          </button>
        )}
      </div>
    </div>
  );
}
