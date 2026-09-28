"use client";

import { useState } from "react";

import { useAdminComplaints } from "@/features/admin/hooks/useComplaints";
import ErrorBanner from "@/features/shared/components/ErrorBanner";
import { getComplaintStatusStyle } from "@/features/shared/utils/complaintStatus";
import {
  COMPLAINT_DEPARTMENT_LABELS,
  COMPLAINT_DEPARTMENTS,
  type ComplaintDepartmentValue,
} from "@/features/shared/utils/complaintDepartment";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type PendingAction = {
  complaintId: string;
  action: "RESOLVE" | "CLOSE";
  subject: string;
};

/**
 * Replaces the previous `window.prompt(...)` (the browser's native
 * dialog — unstyled, blocks the whole tab, can't be dismissed with
 * Escape-then-continue-typing) with an in-app modal that matches the
 * rest of the admin UI. Same optional-note behavior: Confirm with an
 * empty textarea still resolves/closes, it just sends no note.
 */
function AdminNoteModal({
  pending,
  note,
  onNoteChange,
  onCancel,
  onConfirm,
}: {
  pending: PendingAction;
  note: string;
  onNoteChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isResolve = pending.action === "RESOLVE";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-lg w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-800">
          {isResolve ? "Resolve" : "Close"} complaint
        </h2>
        <p className="text-sm text-gray-500 mt-1 truncate">&ldquo;{pending.subject}&rdquo;</p>

        <label className="block text-xs font-semibold text-gray-600 mt-4">
          Note for the raiser (optional)
          <textarea
            autoFocus
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="Let them know what happened"
            rows={3}
            maxLength={500}
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 outline-none text-sm text-gray-800 focus:border-purple-400 resize-none"
          />
        </label>

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onCancel}
            className="text-sm font-semibold text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`text-sm font-bold text-white px-4 py-2 rounded-lg ${
              isResolve ? "bg-green-600 hover:bg-green-700" : "bg-gray-700 hover:bg-gray-800"
            }`}
          >
            {isResolve ? "Resolve" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ComplaintsBoardProps {
  /** Complaints API base, e.g. "/api/staff/complaints". */
  apiBase: string;
  /** Set for department staff: hides the department filter (their API is already scoped). */
  lockedDepartment?: ComplaintDepartmentValue;
  heading?: string;
}

/**
 * Shared complaints list + actions, used by Admin (all departments) and by
 * Accounts / HR / IT (their own department only). Scoping is enforced by
 * the API; `lockedDepartment` only tweaks the UI.
 */
export default function ComplaintsBoard({
  apiBase,
  lockedDepartment,
  heading = "Complaints",
}: ComplaintsBoardProps) {
  const { complaints, loading, error, markInProgress, resolve, close } =
    useAdminComplaints(apiBase);
  const [showResolved, setShowResolved] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState<ComplaintDepartmentValue | "ALL">("ALL");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  function closeModal() {
    setPendingAction(null);
    setNoteDraft("");
  }

  function confirmAction() {
    if (!pendingAction) return;

    const note = noteDraft.trim() || undefined;

    if (pendingAction.action === "RESOLVE") {
      resolve(pendingAction.complaintId, note);
    } else {
      close(pendingAction.complaintId, note);
    }

    closeModal();
  }

  const byStatus = showResolved
    ? complaints
    : complaints.filter((c) => c.status === "OPEN" || c.status === "IN_PROGRESS");
  const visible =
    departmentFilter === "ALL" ? byStatus : byStatus.filter((c) => c.department === departmentFilter);
  const openCount = complaints.filter((c) => c.status === "OPEN").length;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-purple-600">{heading}</h1>
            <p className="text-gray-500 mt-1">
              {openCount} open complaint{openCount === 1 ? "" : "s"} waiting on you.
            </p>
          </div>

          {!lockedDepartment && (
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value as ComplaintDepartmentValue | "ALL")}
              className="text-sm font-semibold text-purple-600 border border-purple-200 rounded-lg px-3 py-2 bg-white"
              aria-label="Filter by department"
            >
              <option value="ALL">All departments</option>
              {COMPLAINT_DEPARTMENTS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setShowResolved((v) => !v)}
            className="text-sm font-semibold text-purple-600 border border-purple-200 rounded-lg px-4 py-2 hover:bg-purple-50"
          >
            {showResolved ? "Show open only" : "Show all history"}
          </button>
        </div>

        {error && <ErrorBanner>{error}</ErrorBanner>}

        {loading ? (
          <p className="text-gray-500">Loading complaints...</p>
        ) : visible.length === 0 ? (
          <div className="bg-white border rounded-xl p-8 text-center">
            <p className="text-gray-500">
              {showResolved ? "No complaints yet." : "Nothing waiting on your response."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((c) => (
              <div
                key={c.id}
                className="bg-white border rounded-xl p-6 shadow-sm flex items-start justify-between gap-4 flex-wrap"
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                    {c.raiserRole}
                    {!lockedDepartment && c.department && (
                      <span className="ml-2 text-purple-600">
                        → {COMPLAINT_DEPARTMENT_LABELS[c.department]}
                      </span>
                    )}
                  </p>
                  <p className="text-lg font-semibold text-gray-800">
                    {c.raiserName || "Unknown"}
                  </p>
                  {c.raiserEmail && <p className="text-sm text-gray-500">{c.raiserEmail}</p>}
                  <p className="text-sm font-semibold text-gray-700 mt-2">{c.subject}</p>
                  <p className="text-sm text-gray-500 mt-1">{c.description}</p>
                  <p className="text-xs text-gray-400 mt-1">Raised {formatDate(c.createdAt)}</p>
                  {c.adminNote && (
                    <p className="text-xs text-gray-400 mt-1">Your note: {c.adminNote}</p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-3">
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${getComplaintStatusStyle(
                      c.status,
                    )}`}
                  >
                    {c.status}
                  </span>

                  {(c.status === "OPEN" || c.status === "IN_PROGRESS") && (
                    <div className="flex flex-wrap gap-2 justify-end">
                      {c.status === "OPEN" && (
                        <button
                          onClick={() => markInProgress(c.id)}
                          className="text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg"
                        >
                          Mark in progress
                        </button>
                      )}
                      <button
                        onClick={() =>
                          setPendingAction({ complaintId: c.id, action: "RESOLVE", subject: c.subject })
                        }
                        className="text-sm font-bold text-green-700 bg-green-50 hover:bg-green-100 px-4 py-2 rounded-lg"
                      >
                        Resolve
                      </button>
                      <button
                        onClick={() =>
                          setPendingAction({ complaintId: c.id, action: "CLOSE", subject: c.subject })
                        }
                        className="text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg"
                      >
                        Close
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {pendingAction && (
        <AdminNoteModal
          pending={pendingAction}
          note={noteDraft}
          onNoteChange={setNoteDraft}
          onCancel={closeModal}
          onConfirm={confirmAction}
        />
      )}
    </div>
  );
}
