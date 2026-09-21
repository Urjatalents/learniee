"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import { useRenewal } from "@/features/parent/hooks/useRenewal";
import { WEEKDAY_LABELS, formatScheduleTime } from "@/features/shared/utils/weekdays";

interface Props {
  enrollmentId: string;
  onRenewed?: () => void;
}

/**
 * Money and Renewal, Part 2B §2. Only rendered for an ACTIVE,
 * non-legacy enrollment (see EnrollmentStatusCard) — shows nothing
 * once outside the renewal window, and nothing at all once already
 * renewed (a next cycle exists) since the Enrollment just keeps
 * going with no further action needed.
 */
export default function RenewalPanel({ enrollmentId, onRenewed }: Props) {
  const { status, loading, paying, error, renew } = useRenewal(enrollmentId);
  const [scheduleDays, setScheduleDays] = useState<number[]>([]);
  const [scheduleTime, setScheduleTime] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (status?.preview) {
      setScheduleDays(status.preview.scheduleDays);
      setScheduleTime(status.preview.scheduleTime);
    } else if (status) {
      setScheduleDays(status.currentScheduleDays);
      setScheduleTime(status.currentScheduleTime ?? "");
    }
  }, [status]);

  if (loading || !status || status.alreadyRenewed || !status.eligible) {
    return null;
  }

  function toggleDay(day: number) {
    setScheduleDays((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort(),
    );
  }

  async function handleRenew() {
    setMessage(null);
    const result = await renew({ scheduleDays, scheduleTime });
    setMessage({ ok: result.ok, text: result.message });
    if (result.ok) onRenewed?.();
  }

  const preview = status.preview;

  return (
    <div className="mt-4 bg-violet-50 border border-violet-100 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <RefreshCw size={13} className="text-violet-700" />
        <p className="text-xs font-bold text-violet-800">
          Renew cycle {status.currentCycleNumber + 1}
        </p>
      </div>

      <div className="flex gap-1.5 mb-2">
        {WEEKDAY_LABELS.map((label, day) => (
          <button
            key={day}
            type="button"
            onClick={() => toggleDay(day)}
            className={`text-[11px] font-semibold w-8 h-8 rounded-full transition-colors ${
              scheduleDays.includes(day)
                ? "bg-brand text-white"
                : "bg-white text-gray-500 border border-gray-200"
            }`}
          >
            {label[0]}
          </button>
        ))}
      </div>

      <input
        type="time"
        value={scheduleTime}
        onChange={(e) => setScheduleTime(e.target.value)}
        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 mb-2"
      />

      {preview && (
        <p className="text-[11px] text-violet-700 mb-2">
          {preview.sessionCount} sessions from {preview.cycleStartKey} · ₹
          {preview.amountPayable.toLocaleString("en-IN")}
          {preview.isInternationalPayment ? " (incl. surcharge)" : ""}
          {scheduleTime ? ` · ${formatScheduleTime(scheduleTime)}` : ""}
        </p>
      )}

      {(error || message) && (
        <p className={`text-[11px] mb-2 ${message?.ok ? "text-green-700" : "text-red-600"}`}>
          {message?.text ?? error}
        </p>
      )}

      <button
        type="button"
        onClick={handleRenew}
        disabled={paying || scheduleDays.length === 0 || !scheduleTime}
        className="text-xs font-bold text-white bg-brand px-3 py-1.5 rounded-full disabled:opacity-50"
      >
        {paying ? "Processing…" : "Renew & Pay"}
      </button>
    </div>
  );
}
