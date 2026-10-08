"use client";

import { CheckCircle2, Info, Loader2, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { WEEKDAY_LABELS } from "@/features/shared/utils/weekdays";
import { formatCycleSummary } from "@/features/shared/utils/cyclePlan";
import type { useEnrollment } from "./useEnrollment";

interface Props {
  enroll: ReturnType<typeof useEnrollment>;
  studentsLoading: boolean;
  studentCount: number;
}

export default function EnrollSection({ enroll, studentsLoading, studentCount }: Props) {
  const router = useRouter();
  const {
    planType,
    setPlanType,
    startDate,
    setStartDate,
    minStartDate,
    startInPast,
    scheduleDays,
    toggleScheduleDay,
    scheduleTime,
    setScheduleTime,
    ratePerSession,
    cyclePlan,
    planProblem,
    pricePreview,
    enrolling,
    enrollError,
    enrollSuccess,
    enrollChatRoomId,
    handleEnroll,
  } = enroll;

  return (
    <>
      {/* ENROLL — one enrollment is one monthly cycle: weekdays +
          time + start date (Part 1A). The session count and total
          are always calculated server-side in enrollment.service.ts;
          this preview is client-side only so the parent sees the
          total before paying. Payment via
          Razorpay is required before the Enrollment row is created
          (resolves 06-OPEN-DECISIONS.md #36); dual approval (Teacher
          + Admin, #2 still open) hasn't been built either, so a paid
          enrollment starts "Pending approval". */}
      <div className="mt-6 pt-5 border-t border-violet-50">
        <h3 className="font-heading text-sm font-bold text-gray-800 mb-3">
          Enroll in this course
        </h3>

        <div className="mb-3">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
            Plan
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { value: "WEEKLY", title: "Classes weekly", hint: "Pay week by week; classes repeat every week" },
                { value: "MONTHLY", title: "Complete month plan", hint: "Plan and pay for the whole month ahead" },
              ] as const
            ).map((option) => {
              const active = planType === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPlanType(option.value)}
                  aria-pressed={active}
                  className={`text-left rounded-xl border px-3 py-2 transition-colors ${
                    active
                      ? "bg-violet-50 border-brand text-brand-dark"
                      : "bg-white border-violet-100 text-gray-600 hover:border-brand/40"
                  }`}
                >
                  <span className="block text-xs font-bold">{option.title}</span>
                  <span className="block text-[11px] text-gray-500 mt-0.5">{option.hint}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-3">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
            Start date
          </label>
          <input
            type="date"
            min={minStartDate}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full text-sm border border-violet-100 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>

        <div className="mb-3">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
            Class days
          </label>
          <div className="flex gap-1.5 flex-wrap">
            {WEEKDAY_LABELS.map((label, day) => {
              const active = scheduleDays.includes(day);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleScheduleDay(day)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
                    active
                      ? "bg-brand text-white border-brand"
                      : "bg-white text-gray-500 border-violet-100 hover:border-brand/40"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-3">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
            Class time (IST)
          </label>
          <input
            type="time"
            value={scheduleTime}
            onChange={(e) => setScheduleTime(e.target.value)}
            className="w-full text-sm border border-violet-100 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>

        {startInPast && (
          <p className="text-xs text-red-600 mb-3">
            The start date can&apos;t be in the past.
          </p>
        )}

        {cyclePlan && !startInPast && (
          <div className="text-xs text-gray-600 bg-violet-50 rounded-xl px-3 py-2.5 mb-3 space-y-0.5">
            <p className="font-bold text-gray-800">
              {formatCycleSummary(cyclePlan)}
            </p>
            {planProblem ? (
              <p className="text-red-600">{planProblem}</p>
            ) : (
              pricePreview &&
              ratePerSession && (
                <p>
                  {pricePreview.sessionCount} × ₹
                  {ratePerSession.toLocaleString("en-IN")} ={" "}
                  <span className="font-bold text-gray-800">
                    ₹{pricePreview.totalAmount.toLocaleString("en-IN")}
                  </span>
                </p>
              )
            )}
          </div>
        )}

        {enrollError && (
          <p className="text-xs text-red-600 mb-2">{enrollError}</p>
        )}

        {enrollSuccess && (
          <div className="mb-2">
            <div className="flex items-start gap-2 text-xs text-emerald-600 font-semibold">
              <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" />
              {enrollSuccess}
            </div>

            {enrollChatRoomId && (
              <button
                type="button"
                onClick={() => router.push(`/parent/chat/${enrollChatRoomId}`)}
                className="mt-2 w-full flex items-center justify-center gap-2 text-xs font-bold text-brand-dark bg-violet-50 hover:bg-violet-100 px-4 py-2 rounded-full transition-colors"
              >
                <MessageCircle size={14} />
                Chat with your teacher
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleEnroll}
          disabled={
            enrolling ||
            studentsLoading ||
            studentCount === 0 ||
            scheduleDays.length === 0 ||
            !scheduleTime ||
            !startDate ||
            startInPast ||
            !cyclePlan ||
            !!planProblem
          }
          title={
            scheduleDays.length === 0 || !scheduleTime
              ? "Pick class days and time first"
              : startInPast || !startDate
                ? "Pick a start date that isn't in the past"
                : planProblem
                  ? planProblem
                  : undefined
          }
          className="w-full text-sm font-bold text-white bg-brand-dark px-4 py-2.5 rounded-full disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
        >
          {enrolling && <Loader2 size={14} className="animate-spin" />}
          {pricePreview
            ? `Pay ₹${pricePreview.totalAmount.toLocaleString("en-IN")} & Enroll`
            : "Enroll Now"}
        </button>

        <p className="flex items-start gap-2 mt-3 text-[11px] text-gray-400 leading-relaxed">
          <Info size={13} className="flex-shrink-0 mt-0.5" />
          Payment is collected via Razorpay before your enrollment is
          created. After that, it&apos;s waiting for teacher approval —
          you&apos;ll be able to track it and chat with your teacher from
          &quot;My Enrollments&quot;.
        </p>
      </div>
    </>
  );
}
