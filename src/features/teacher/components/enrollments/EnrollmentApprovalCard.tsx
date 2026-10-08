"use client";

import { BookOpen, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import CycleProgressRing from "@/features/shared/components/CycleProgressRing";
import {
    buildCyclePlan,
    formatCycleRange,
    isStartDateInPast,
} from "@/features/shared/utils/cyclePlan";
import { getEnrollmentStatusLabel, getEnrollmentStatusStyle } from "@/features/shared/utils/enrollmentStatus";
import { formatSchedule } from "@/features/shared/utils/weekdays";
import SessionsList from "@/features/teacher/components/enrollments/SessionsList";
import type { TeacherEnrollment } from "@/features/teacher/hooks/useEnrollments";
import { toDateKey, todayInPlatformTz } from "@/lib/platformTime";
import RevisionForm from "./RevisionForm";
import ScheduleEditor from "./ScheduleEditor";

interface Props {
  enrollment: TeacherEnrollment;
  onApprove: (id: string) => void;
  onReject: (id: string, reason?: string) => void;
  onRevise: (
    id: string,
    input: {
      note: string;
      cycleStartDate?: string;
      sessionsPerMonth?: number;
      scheduleDays?: number[];
      scheduleTime?: string;
    },
  ) => void;
  onSetSchedule: (
    id: string,
    input: { scheduleDays: number[]; scheduleTime: string },
  ) => void;
  /** Called after a specific date is marked complete from the Sessions list, with the recomputed enrollment fields. */
  onSessionMarked?: (patch: Partial<TeacherEnrollment>) => void;
}

function displayName(p: { firstName: string; lastName: string }) {
  return `${p.firstName} ${p.lastName}`.trim();
}

export default function EnrollmentApprovalCard({
  enrollment,
  onApprove,
  onReject,
  onRevise,
  onSetSchedule,
  onSessionMarked,
}: Props) {
  const router = useRouter();
  const [revising, setRevising] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(false);

  const label = getEnrollmentStatusLabel(enrollment.status, "teacher");
  const style = getEnrollmentStatusStyle(enrollment.status);
  const actionable = enrollment.status === "PENDING_TEACHER_APPROVAL";
  const isActive = enrollment.status === "ACTIVE" || enrollment.status === "LAPSED";
  // COMPLETED cycles can't be marked/edited any more, but the
  // Teacher can still open the session history for the record.
  const canViewSessions = isActive || enrollment.status === "COMPLETED";
  const hasSchedule = (enrollment.scheduleDays?.length ?? 0) > 0;

  // Cycle model (non-legacy): one monthly cycle, session count and
  // price follow from the schedule + start date, and a start date
  // that has passed blocks approval until it's revised.
  const cyclePlan = !enrollment.isLegacy
    ? buildCyclePlan(
        enrollment.cycleStartDate.slice(0, 10),
        enrollment.scheduleDays ?? [],
        enrollment.planType ?? "MONTHLY",
      )
    : null;
  const startPassed = cyclePlan
    ? isStartDateInPast(cyclePlan.startDate, todayInPlatformTz())
    : false;
  const needsNewStart =
    startPassed && enrollment.status === "PENDING_ADMIN_APPROVAL";
  const canRevise = actionable || needsNewStart;
  const minStartDate = toDateKey(todayInPlatformTz());

  return (
    <div
      id={`enrollment-${enrollment.id}`}
      className="bg-white border rounded-xl p-5 scroll-mt-24"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-gray-800 truncate">
            {enrollment.course.courseTitle ?? "Untitled course"}
          </p>
          <p className="text-sm text-gray-500 truncate">
            {displayName(enrollment.parent)} — child:{" "}
            {enrollment.student.visibleName || enrollment.student.firstName}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {isActive && (
            <CycleProgressRing
              completed={enrollment.sessionsCompletedInCycle}
              total={enrollment.sessionsPerMonth}
              colorClassName="text-purple-600"
            />
          )}
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${style}`}>
            {label}
          </span>
        </div>
      </div>

      {isActive && enrollment.cyclesCompleted > 0 && (
        <p className="text-[11px] text-gray-400 mt-1">
          {enrollment.cyclesCompleted} cycle{enrollment.cyclesCompleted === 1 ? "" : "s"} completed
          {enrollment.cyclePayoutStatus === "READY_FOR_PAYOUT" && " · payout pending"}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 mt-3 text-xs text-gray-600">
        {cyclePlan ? (
          <p className="col-span-2">
            Cycle:{" "}
            <span className="font-semibold">
              {enrollment.sessionsPerMonth} session
              {enrollment.sessionsPerMonth === 1 ? "" : "s"},{" "}
              {formatCycleRange(cyclePlan)}
            </span>
          </p>
        ) : (
          <>
            <p>Sessions/month: <span className="font-semibold">{enrollment.sessionsPerMonth}</span></p>
            <p>Months: <span className="font-semibold">{enrollment.noOfMonths}</span></p>
            <p>
              Start:{" "}
              <span className="font-semibold">
                {new Date(enrollment.cycleStartDate).toLocaleDateString()}
              </span>
            </p>
          </>
        )}
        <p>Total paid: <span className="font-semibold">₹{enrollment.amountPaid}</span></p>
        <p className="col-span-2 flex items-center gap-2 flex-wrap">
          Schedule:{" "}
          <span className="font-semibold">
            {formatSchedule(enrollment.scheduleDays, enrollment.scheduleTime)}
          </span>
          {isActive && enrollment.isLegacy && !editingSchedule && (
            <button
              type="button"
              onClick={() => setEditingSchedule(true)}
              className="text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded-full"
            >
              {hasSchedule ? "Edit" : "Set schedule"}
            </button>
          )}
        </p>
      </div>

      {isActive && enrollment.isLegacy && editingSchedule && (
        <ScheduleEditor
          hasSchedule={hasSchedule}
          initialDays={enrollment.scheduleDays ?? []}
          initialTime={enrollment.scheduleTime ?? ""}
          onSave={(input) => {
            onSetSchedule(enrollment.id, input);
            setEditingSchedule(false);
          }}
          onCancel={() => setEditingSchedule(false)}
        />
      )}

      {startPassed &&
        (actionable || enrollment.status === "PENDING_ADMIN_APPROVAL") && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-3">
            ⚠ The start date has already passed, so this can&apos;t be approved
            as is. Use &quot;Propose a change&quot; to set a new start date.
          </p>
        )}

      {enrollment.pricingChangedAfterPayment && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-3">
          ⚠ The revised total (₹{enrollment.totalAmount}) no longer matches what
          was actually charged (₹{enrollment.amountPaid}). No extra charge or
          refund was made automatically — reconcile manually.
        </p>
      )}

      <div className="flex flex-wrap gap-2 mt-3">
        {enrollment.chatRoom && (
          <button
            type="button"
            onClick={() => router.push(`/teacher/chat/${enrollment.chatRoom!.id}`)}
            className="flex items-center gap-2 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-2 rounded-full transition-colors"
          >
            <MessageCircle size={13} />
            Discuss in chat
          </button>
        )}

        {canViewSessions && (
          <button
            type="button"
            onClick={() => setShowSessions((s) => !s)}
            className="text-xs font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded-full transition-colors"
          >
            {showSessions ? "Hide sessions" : "View sessions"}
          </button>
        )}

        {isActive && (
          <button
            type="button"
            onClick={() => router.push(`/teacher/enrollments/${enrollment.id}/homework`)}
            className="flex items-center gap-2 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-2 rounded-full transition-colors"
          >
            <BookOpen size={13} />
            Homework
          </button>
        )}
      </div>

      {canViewSessions && showSessions && (
        <SessionsList
          enrollmentId={enrollment.id}
          onSessionMarked={(patch) => onSessionMarked?.(patch as Partial<TeacherEnrollment>)}
        />
      )}

      {canRevise && !revising && (
        <div className="flex gap-2 mt-4">
          {actionable && (
            <button
              type="button"
              onClick={() => onApprove(enrollment.id)}
              disabled={startPassed}
              title={startPassed ? "Start date has passed — propose a new one" : undefined}
              className="text-xs font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2 rounded-full"
            >
              Approve
            </button>
          )}
          <button
            type="button"
            onClick={() => setRevising(true)}
            className="text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-2 rounded-full"
          >
            Propose a change
          </button>
          {actionable && (
            <button
              type="button"
              onClick={() => onReject(enrollment.id, window.prompt("Reason (optional):") || undefined)}
              className="text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-full"
            >
              Reject
            </button>
          )}
        </div>
      )}

      {canRevise && revising && (
        <RevisionForm
          isLegacy={enrollment.isLegacy}
          minStartDate={minStartDate}
          onSubmit={(input) => {
            onRevise(enrollment.id, input);
            setRevising(false);
          }}
          onCancel={() => setRevising(false)}
        />
      )}
    </div>
  );
}
