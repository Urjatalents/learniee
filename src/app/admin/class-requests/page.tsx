"use client";

import { formatSchedule } from "@/features/shared/utils/weekdays";
import { useState } from "react";

import { useAdminClassRequests, type AdminClassRequest } from "@/features/class-requests/hooks/useClassRequests";
import ErrorBanner from "@/features/shared/components/ErrorBanner";
import {
  CLASS_REQUEST_STATUS_LABELS,
  formatClassRequestDate,
  getClassRequestStatusStyle,
} from "@/features/shared/utils/classRequestStatus";

/**
 * Admin "Class Req / Vacancy" screen. Vets parents' custom class requests:
 * Approve circulates it to every approved teacher as a vacancy; Reject needs a
 * reason the parent sees; Close ends an open vacancy. Also shows who accepted
 * and whether they've listed a course. See `classRequest.service.ts`.
 */

type Tab = "PENDING_REVIEW" | "OPEN" | "DONE";

const TABS: { value: Tab; label: string }[] = [
  { value: "PENDING_REVIEW", label: "To review" },
  { value: "OPEN", label: "Open vacancies" },
  { value: "DONE", label: "Rejected / closed" },
];

function teacherName(t: { firstName: string; lastName: string; visibleName: string | null }) {
  return t.visibleName || `${t.firstName} ${t.lastName}`.trim();
}

export default function AdminClassRequestsPage() {
  const { requests, loading, error, busyId, act } = useAdminClassRequests();
  const [tab, setTab] = useState<Tab>("PENDING_REVIEW");
  const [pending, setPending] = useState<{ request: AdminClassRequest; action: "REJECT" | "CLOSE" } | null>(null);
  const [note, setNote] = useState("");

  const counts = {
    PENDING_REVIEW: requests.filter((r) => r.status === "PENDING_REVIEW").length,
    OPEN: requests.filter((r) => r.status === "OPEN").length,
    DONE: requests.filter((r) => r.status === "REJECTED" || r.status === "CLOSED").length,
  };

  const visible = requests.filter((r) =>
    tab === "DONE" ? r.status === "REJECTED" || r.status === "CLOSED" : r.status === tab,
  );

  async function confirm() {
    if (!pending) return;

    if (pending.action === "REJECT" && !note.trim()) return;

    if (await act(pending.request.id, pending.action, note.trim() || undefined)) {
      setPending(null);
      setNote("");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800">Class Requests / Vacancy</h1>
        <p className="text-sm text-gray-500 mt-1 mb-6">
          Custom classes parents asked for. Approve to share with teachers as a vacancy.
        </p>

        {error && <ErrorBanner>{error}</ErrorBanner>}

        <div className="flex gap-2 mb-6">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={`text-sm font-semibold px-4 py-2 rounded-lg ${
                tab === t.value ? "bg-purple-600 text-white" : "bg-white border text-gray-600 hover:bg-gray-100"
              }`}
            >
              {t.label} ({counts[t.value]})
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : visible.length === 0 ? (
          <div className="bg-white border rounded-xl p-10 text-center text-sm text-gray-500">Nothing here.</div>
        ) : (
          <div className="space-y-4">
            {visible.map((r) => {
              const busy = busyId === r.id;
              const accepted = r.responses.filter((x) => x.status === "ACCEPTED");
              const declined = r.responses.length - accepted.length;

              return (
                <article key={r.id} className="bg-white border rounded-xl shadow-sm p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-semibold text-gray-800">{r.title}</h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {[r.subject, r.grade, r.board, r.language].filter(Boolean).join(" · ")}
                      </p>
                      <p className="text-xs text-gray-500">
                        By {r.parentName} ({r.parentEmail}){r.studentName ? ` for ${r.studentName}` : ""} ·{" "}
                        {formatClassRequestDate(r.createdAt)}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${getClassRequestStatusStyle(r.status)}`}>
                      {CLASS_REQUEST_STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mt-3 whitespace-pre-line">{r.description}</p>

                  <p className="text-xs text-gray-500 mt-2">
                    {[
                      r.sessionsPerWeek ? `${r.sessionsPerWeek} class(es)/week` : null,
                      r.preferredDays.length > 0
                        ? `Schedule: ${formatSchedule(r.preferredDays, r.preferredTime)} (IST)`
                        : r.preferredSchedule
                          ? `Timings: ${r.preferredSchedule}`
                          : null,
                      r.pricePerSession ? `Fixed price ₹${r.pricePerSession}/hour` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>

                  {r.adminNote && <p className="mt-2 text-sm text-gray-600">Note: {r.adminNote}</p>}

                  {r.status !== "PENDING_REVIEW" && r.responses.length > 0 && (
                    <div className="mt-3 border-t pt-3 text-sm text-gray-600 space-y-1">
                      <p className="text-xs font-semibold text-gray-500">
                        Teacher responses: {accepted.length} accepted, {declined} declined
                      </p>
                      {accepted.map((x) => (
                        <p key={x.id}>
                          {teacherName(x.teacher)} accepted,{" "}
                          {x.course
                            ? `listing "${x.course.courseTitle}" (${x.course.status === "APPROVED" ? "live" : x.course.status.toLowerCase().replace("_", " ")})`
                            : "listing not created yet"}
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    {r.status === "PENDING_REVIEW" && (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => act(r.id, "APPROVE")}
                          className="text-sm font-bold text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg disabled:opacity-60"
                        >
                          {busy ? "Working..." : "Approve & share with teachers"}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setPending({ request: r, action: "REJECT" })}
                          className="text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 px-4 py-2 rounded-lg"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {r.status === "OPEN" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setPending({ request: r, action: "CLOSE" })}
                        className="text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-lg"
                      >
                        Close vacancy
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {pending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => {
            setPending(null);
            setNote("");
          }}
        >
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-800">
              {pending.action === "REJECT" ? "Reject request" : "Close vacancy"}
            </h2>
            <p className="text-sm text-gray-500 mt-1 truncate">&ldquo;{pending.request.title}&rdquo;</p>

            <label className="block text-xs font-semibold text-gray-600 mt-4">
              {pending.action === "REJECT" ? "Reason for the parent (required)" : "Note for the parent (optional)"}
              <textarea
                autoFocus
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={500}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 outline-none text-sm focus:border-purple-400 resize-none"
              />
            </label>

            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => {
                  setPending(null);
                  setNote("");
                }}
                className="text-sm font-semibold text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={pending.action === "REJECT" && !note.trim()}
                className="text-sm font-bold text-white bg-gray-800 hover:bg-gray-900 px-4 py-2 rounded-lg disabled:opacity-50"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
