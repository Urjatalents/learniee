"use client";

import { useState } from "react";

import { useSessionReviews } from "@/features/admin/hooks/useSessionReviews";
import ErrorBanner from "@/features/shared/components/ErrorBanner";
import { formatPlatformTime } from "@/lib/platformTime";
import {
  ADMIN_DECISION_OPTIONS,
  DECISION_REASON_MAX_LENGTH,
  DECISION_REASON_MIN_LENGTH,
} from "@/features/shared/utils/outcomeConfirmation";
import {
  SESSION_STATUS_LABEL,
  SESSION_STATUS_STYLE,
  type SessionStatusValue,
} from "@/features/shared/utils/sessionOutcome";
import type { SessionReviewItem } from "@/features/shared/types/sessionReview";

function at(iso: string | null) {
  return iso ? formatPlatformTime(new Date(iso), true) : "—";
}

const REASON_LABEL = {
  NEEDS_REVIEW: "Needs review",
  REPORTED: "Parent reported",
  DECIDED: "Decided",
} as const;

function StatusPill({ status }: { status: SessionStatusValue }) {
  return (
    <span
      className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${SESSION_STATUS_STYLE[status]}`}
    >
      {SESSION_STATUS_LABEL[status]}
    </span>
  );
}

function DecisionModal({
  item,
  onCancel,
  onSubmit,
}: {
  item: SessionReviewItem;
  onCancel: () => void;
  onSubmit: (status: string, reason: string) => Promise<string | null>;
}) {
  const [status, setStatus] = useState<string>(
    item.reason === "REPORTED" ? item.status : "",
  );
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isOverride = item.kind === "OVERRIDE";
  const stands = status === item.status;
  const reasonLength = reason.trim().length;
  const canSubmit =
    !busy &&
    status !== "" &&
    reasonLength >= DECISION_REASON_MIN_LENGTH &&
    !(isOverride && stands);

  async function submit() {
    setBusy(true);
    setError("");

    const failure = await onSubmit(status, reason);

    if (failure) {
      setError(failure);
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={busy ? undefined : onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-800">
          {isOverride ? "Override outcome" : "Decide outcome"}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Recorded as <strong>{SESSION_STATUS_LABEL[item.status]}</strong>.
          {item.reason === "REPORTED" && " Pick the same outcome to keep it as recorded."}
        </p>

        <div className="mt-4 space-y-2">
          {ADMIN_DECISION_OPTIONS.map((option) => (
            <label
              key={option.status}
              className={`flex items-start gap-3 border rounded-lg px-3 py-2 cursor-pointer ${
                status === option.status
                  ? "border-purple-400 bg-purple-50"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="outcome"
                value={option.status}
                checked={status === option.status}
                onChange={() => setStatus(option.status)}
                className="mt-1"
              />
              <span>
                <span className="text-sm font-semibold text-gray-800">
                  {option.label}
                  {option.status === item.status && (
                    <span className="ml-2 text-xs font-normal text-gray-400">(as recorded)</span>
                  )}
                </span>
                <span className="block text-xs text-gray-500">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>

        <label className="block text-xs font-semibold text-gray-600 mt-4">
          Reason (required — it is logged and shown in the class history)
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={DECISION_REASON_MAX_LENGTH}
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 outline-none text-sm text-gray-800 focus:border-purple-400 resize-none"
          />
        </label>

        {isOverride && stands && (
          <p className="text-xs text-amber-700 mt-2">
            That is already the recorded outcome — pick a different one to override it.
          </p>
        )}

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onCancel}
            disabled={busy}
            className="text-sm font-semibold text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-4 py-2 rounded-lg"
          >
            {busy ? "Saving…" : "Save decision"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewCard({ item, onDecide }: { item: SessionReviewItem; onDecide: () => void }) {
  return (
    <div className="bg-white border rounded-xl p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
            {REASON_LABEL[item.reason]}
            {item.sessionNumber !== null && ` · Session ${item.sessionNumber}`}
            {item.cycle && ` · Cycle ${item.cycle.cycleNumber} (${item.cycle.status.toLowerCase()})`}
          </p>
          <p className="text-lg font-semibold text-gray-800">
            {item.courseTitle ?? "Class"} — {item.studentName}
          </p>
          <p className="text-sm text-gray-500">
            Teacher {item.teacherName} · Parent {item.parentName}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {at(item.startsAt)} – {at(item.endsAt)}
          </p>
        </div>

        <div className="flex flex-col items-end gap-3">
          <StatusPill status={item.status} />
          <button
            onClick={onDecide}
            className="text-sm font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-4 py-2 rounded-lg"
          >
            {item.kind === "OVERRIDE" ? "Override" : "Decide"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm">
        <div>
          <p className="text-xs text-gray-400">Teacher started</p>
          <p className="text-gray-700">{at(item.teacherStartedAt)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Student joined</p>
          <p className="text-gray-700">{at(item.studentJoinedAt)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Teacher ended</p>
          <p className="text-gray-700">{at(item.teacherEndedAt)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Time together</p>
          <p className="text-gray-700">
            {item.overlapPercent !== null ? `${item.overlapPercent}% of the class` : "—"}
          </p>
        </div>
      </div>

      {item.status === "CANCELLED" || item.status === "CANCELLED_LATE" ? (
        <p className="text-xs text-gray-500 mt-3">
          Cancelled by {item.cancelledByRole?.toLowerCase() ?? "unknown"}
          {item.cancelReason ? `: ${item.cancelReason}` : "."}
        </p>
      ) : null}

      {item.reportNote && (
        <div className="mt-4 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          <p className="text-xs font-semibold text-red-700">
            Parent&apos;s report · {at(item.reportedAt)}
          </p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.reportNote}</p>
        </div>
      )}

      {item.teacherSummary && (
        <div className="mt-3 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
          <p className="text-xs font-semibold text-gray-500">Teacher&apos;s summary</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.teacherSummary}</p>
        </div>
      )}

      {item.cycle?.status === "CLOSED" && (
        <p className="text-xs text-amber-700 mt-3">
          This cycle has already closed ({item.cycle.countedSessionCount ?? 0} counted,{" "}
          {item.cycle.forfeitedSessionCount ?? 0} forfeited). A decision here re-counts it.
        </p>
      )}

      {item.history.length > 0 && (
        <div className="mt-4 border-t pt-3 space-y-1">
          <p className="text-xs font-semibold text-gray-500">History</p>
          {item.history.map((h) => (
            <p key={h.id} className="text-xs text-gray-500">
              {at(h.createdAt)} · {h.kind === "OVERRIDE" ? "Override" : "Decision"}:{" "}
              {SESSION_STATUS_LABEL[h.fromStatus]} → {SESSION_STATUS_LABEL[h.toStatus]}
              {h.decidedByName ? ` · ${h.decidedByName}` : ""} — {h.reason}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminSessionReviewsPage() {
  const { open, decided, loading, error, decide } = useSessionReviews();
  const [tab, setTab] = useState<"open" | "decided">("open");
  const [active, setActive] = useState<SessionReviewItem | null>(null);
  const [notice, setNotice] = useState<string[]>([]);

  const visible = tab === "open" ? open : decided;

  async function handleSubmit(status: string, reason: string) {
    if (!active) return null;

    const result = await decide({
      sessionId: active.id,
      status,
      expectedStatus: active.status,
      reason,
    });

    if (!result.ok) return result.error ?? "Failed to save this decision.";

    setNotice(result.warnings);
    setActive(null);

    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-purple-600">Class Reviews</h1>
            <p className="text-gray-500 mt-1">
              {open.length} class{open.length === 1 ? "" : "es"} waiting for your decision.
            </p>
          </div>

          <div className="flex gap-2">
            {(["open", "decided"] as const).map((key) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`text-sm font-semibold rounded-lg px-4 py-2 border ${
                  tab === key
                    ? "bg-purple-600 text-white border-purple-600"
                    : "text-purple-600 border-purple-200 hover:bg-purple-50"
                }`}
              >
                {key === "open" ? "Needs a decision" : "Decided"}
              </button>
            ))}
          </div>
        </div>

        {error && <ErrorBanner>{error}</ErrorBanner>}

        {notice.length > 0 && (
          <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-4 text-sm space-y-1">
            <p className="font-semibold">Decision saved. Please note:</p>
            {notice.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
            <button
              onClick={() => setNotice([])}
              className="text-xs font-semibold underline underline-offset-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading class reviews...</p>
        ) : visible.length === 0 ? (
          <div className="bg-white border rounded-xl p-8 text-center">
            <p className="text-gray-500">
              {tab === "open" ? "Nothing waiting on a decision." : "No decisions yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((item) => (
              <ReviewCard key={item.id} item={item} onDecide={() => setActive(item)} />
            ))}
          </div>
        )}
      </div>

      {active && (
        <DecisionModal
          item={active}
          onCancel={() => setActive(null)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
