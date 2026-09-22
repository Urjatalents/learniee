"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MessageCircle, BookOpen } from "lucide-react";

import type { TeacherEnrollment } from "@/features/teacher/hooks/useEnrollments";
import { getEnrollmentStatusLabel, getEnrollmentStatusStyle } from "@/features/shared/utils/enrollmentStatus";
import { WEEKDAY_LABELS, formatSchedule } from "@/features/shared/utils/weekdays";
import CycleProgressRing from "@/features/shared/components/CycleProgressRing";
import SessionsList from "@/features/teacher/components/enrollments/SessionsList";
import {
  buildCyclePlan,
  formatCycleRange,
  isStartDateInPast,
} from "@/features/shared/utils/cyclePlan";
import { toDateKey, todayInPlatformTz } from "@/lib/platformTime";

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
  const [note, setNote] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newSessions, setNewSessions] = useState("");
  const [newScheduleDays, setNewScheduleDays] = useState<number[]>([]);
  const [newScheduleTime, setNewScheduleTime] = useState("");

  const [editingSchedule, setEditingSchedule] = useState(false);
  const [scheduleDaysDraft, setScheduleDaysDraft] = useState<number[]>(
    enrollment.scheduleDays ?? [],
  );
  const [scheduleTimeDraft, setScheduleTimeDraft] = useState(
    enrollment.scheduleTime ?? "",
  );

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
      )
    : null;
  const startPassed = cyclePlan
    ? isStartDateInPast(cyclePlan.startDate, todayInPlatformTz())
    : false;
  const needsNewStart =
    startPassed && enrollment.status === "PENDING_ADMIN_APPROVAL";
  const canRevise = actionable || needsNewStart;
  const minStartDate = toDateKey(todayInPlatformTz());

  function toggleScheduleDraftDay(day: number) {
    setScheduleDaysDraft((current) =>
      current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day].sort((a, b) => a - b),
    );
  }

  function submitSchedule() {
    if (scheduleDaysDraft.length === 0 || !scheduleTimeDraft) return;

    onSetSchedule(enrollment.id, {
      scheduleDays: scheduleDaysDraft,
      scheduleTime: scheduleTimeDraft,
    });
    setEditingSchedule(false);
  }

  function toggleNewScheduleDay(day: number) {
    setNewScheduleDays((current) =>
      current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day].sort((a, b) => a - b),
    );
  }

  function submitRevision() {
    if (!note.trim()) return;

    onRevise(enrollment.id, {
      note,
      cycleStartDate: newDate || undefined,
      sessionsPerMonth:
        enrollment.isLegacy && newSessions ? Number(newSessions) : undefined,
      scheduleDays: newScheduleDays.length ? newScheduleDays : undefined,
      scheduleTime: newScheduleTime || undefined,
    });

    setRevising(false);
    setNote("");
    setNewDate("");
    setNewSessions("");
    setNewScheduleDays([]);
    setNewScheduleTime("");
  }

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
              onClick={() => {
                setScheduleDaysDraft(enrollment.scheduleDays ?? []);
                setScheduleTimeDraft(enrollment.scheduleTime ?? "");
                setEditingSchedule(true);
              }}
              className="text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded-full"
            >
              {hasSchedule ? "Edit" : "Set schedule"}
            </button>
          )}
        </p>
      </div>

      {isActive && enrollment.isLegacy && editingSchedule && (
        <div className="mt-3 bg-purple-50 border border-purple-100 rounded-xl p-3 space-y-2">
          {!hasSchedule && (
            <p className="text-[11px] text-purple-700">
              This enrollment has no schedule yet, so it won&apos;t show on the
              calendar until one is set.
            </p>
          )}
          <div className="flex gap-1 flex-wrap">
            {WEEKDAY_LABELS.map((label, day) => {
              const active = scheduleDaysDraft.includes(day);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleScheduleDraftDay(day)}
                  className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
                    active
                      ? "bg-purple-600 text-white border-purple-600"
                      : "bg-white text-gray-500 border-purple-200"
                  }`}
                >
                  {label}
                </button>
              );
            })}
            <input
              type="time"
              value={scheduleTimeDraft}
              onChange={(e) => setScheduleTimeDraft(e.target.value)}
              className="text-xs border border-purple-200 rounded-lg px-2 py-1 bg-white"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={submitSchedule}
              disabled={scheduleDaysDraft.length === 0 || !scheduleTimeDraft}
              className="text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-40 px-3 py-1.5 rounded-full"
            >
              Save schedule
            </button>
            <button
              type="button"
              onClick={() => setEditingSchedule(false)}
              className="text-xs font-bold text-gray-600 bg-white border border-gray-200 px-3 py-1.5 rounded-full"
            >
              Cancel
            </button>
          </div>
        </div>
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
        <div className="mt-4 bg-purple-50 border border-purple-100 rounded-xl p-3 space-y-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Explain the change to the parent (required) — full discussion happens in chat"
            className="w-full text-xs border border-purple-200 rounded-lg px-2 py-1.5 bg-white"
            rows={2}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              min={enrollment.isLegacy ? undefined : minStartDate}
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="text-xs border border-purple-200 rounded-lg px-2 py-1.5 bg-white"
            />
            {enrollment.isLegacy && (
              <input
                type="number"
                min={4}
                max={31}
                value={newSessions}
                onChange={(e) => setNewSessions(e.target.value)}
                placeholder="New sessions/month"
                className="text-xs border border-purple-200 rounded-lg px-2 py-1.5 bg-white"
              />
            )}
          </div>
          {!enrollment.isLegacy && (
            <p className="text-[11px] text-purple-700">
              Propose a different start date and/or weekly schedule — the
              session count and price are recalculated from it (minimum 4
              sessions in the cycle). Times are in IST.
            </p>
          )}

          <div className="flex gap-1 flex-wrap">
            {WEEKDAY_LABELS.map((label, day) => {
              const active = newScheduleDays.includes(day);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleNewScheduleDay(day)}
                  className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
                    active
                      ? "bg-purple-600 text-white border-purple-600"
                      : "bg-white text-gray-500 border-purple-200"
                  }`}
                >
                  {label}
                </button>
              );
            })}
            <input
              type="time"
              value={newScheduleTime}
              onChange={(e) => setNewScheduleTime(e.target.value)}
              className="text-xs border border-purple-200 rounded-lg px-2 py-1 bg-white"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={submitRevision}
              disabled={!note.trim()}
              className="text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-40 px-3 py-1.5 rounded-full"
            >
              Send to parent
            </button>
            <button
              type="button"
              onClick={() => setRevising(false)}
              className="text-xs font-bold text-gray-600 bg-white border border-gray-200 px-3 py-1.5 rounded-full"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
