"use client";

import { useState } from "react";
import { CalendarClock } from "lucide-react";

interface Props {
  interviewScheduledAt: string | null;
  interviewDetails: string | null;
  busy: boolean;
  /** Resolves true when the interview was saved. */
  onSchedule: (scheduledAtIso: string, details: string) => Promise<boolean>;
  onCancel: () => void;
}

/**
 * Optional interview step on a pending teacher application. Admin picks a
 * date/time (and a meeting link or instructions); the teacher is notified.
 * The outcome is the normal decision below: Approve = selected, Reject = not
 * selected (starts the appeal waiting period).
 */
export default function TeacherInterviewPanel({
  interviewScheduledAt,
  interviewDetails,
  busy,
  onSchedule,
  onCancel,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [when, setWhen] = useState("");
  const [details, setDetails] = useState(interviewDetails ?? "");
  const [formError, setFormError] = useState("");

  const scheduled = interviewScheduledAt ? new Date(interviewScheduledAt) : null;
  const showForm = editing || !scheduled;

  async function submit() {
    setFormError("");

    const date = new Date(when); // datetime-local is read in the admin's own timezone
    if (!when || Number.isNaN(date.getTime())) {
      setFormError("Pick a date and time.");
      return;
    }
    if (date.getTime() <= Date.now()) {
      setFormError("Pick a time in the future.");
      return;
    }

    const ok = await onSchedule(date.toISOString(), details);
    if (ok) {
      setEditing(false);
      setWhen("");
    }
  }

  return (
    <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-purple-800">
        <CalendarClock className="size-4" />
        Interview
      </h2>

      {scheduled && !editing && (
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-800">
              {scheduled.toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
                dateStyle: "medium",
                timeStyle: "short",
              })}{" "}
              (IST)
            </p>
            {interviewDetails && (
              <p className="mt-1 whitespace-pre-line text-xs text-gray-500">{interviewDetails}</p>
            )}
            <p className="mt-2 text-xs text-gray-500">
              After the interview use Approve (selected) or Reject (not selected) below.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setDetails(interviewDetails ?? "");
                setEditing(true);
              }}
              disabled={busy}
              className="rounded-lg border px-3 py-1.5 text-xs text-gray-600 hover:bg-white disabled:opacity-60"
            >
              Reschedule
            </button>
            <button
              onClick={onCancel}
              disabled={busy}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              Cancel interview
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="mt-3 space-y-3">
          {!scheduled && (
            <p className="text-xs text-gray-500">
              Optional. Schedule an interview before deciding — the teacher is notified.
            </p>
          )}

          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="w-full rounded-lg border bg-white px-3 py-2 text-sm sm:w-72"
          />

          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Meeting link or instructions (optional)"
            className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
          />

          {formError && <p className="text-xs text-red-600">{formError}</p>}

          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={busy}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700 disabled:opacity-60"
            >
              {busy ? "Saving..." : scheduled ? "Save new time" : "Schedule interview"}
            </button>
            {editing && (
              <button
                onClick={() => setEditing(false)}
                disabled={busy}
                className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-white"
              >
                Back
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
