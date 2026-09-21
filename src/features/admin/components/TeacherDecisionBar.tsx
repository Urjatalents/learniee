"use client";

import { useState } from "react";

import type { TeacherApprovalState } from "@/features/admin/types/teacher";

interface Props {
  teacherName: string;
  status: TeacherApprovalState;
  deciding: boolean;
  onDecide: (status: Exclude<TeacherApprovalState, "PENDING">) => void;
}

type Pending = Exclude<TeacherApprovalState, "PENDING"> | null;

/**
 * Sticky Approve / Reject bar with a confirmation step, so a click on a long
 * page can't approve or reject someone by accident. Decisions can be changed
 * later (Approved → Rejected and back), so both buttons follow the current status.
 */
export default function TeacherDecisionBar({ teacherName, status, deciding, onDecide }: Props) {
  const [confirming, setConfirming] = useState<Pending>(null);

  const canApprove = status !== "APPROVED";
  const canReject = status !== "REJECTED";

  function confirm() {
    if (!confirming) return;
    onDecide(confirming);
    setConfirming(null);
  }

  return (
    <>
      <div className="sticky bottom-0 z-10 -mx-8 mt-8 border-t bg-white/95 px-8 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            {status === "PENDING"
              ? "Review the application above, then approve or reject."
              : status === "APPROVED"
                ? "This teacher is approved."
                : "This teacher was rejected."}
          </p>

          <div className="flex gap-3">
            {canReject && (
              <button
                onClick={() => setConfirming("REJECTED")}
                disabled={deciding}
                className="rounded-lg bg-red-600 px-6 py-2 text-white hover:bg-red-700 disabled:opacity-60"
              >
                {status === "APPROVED" ? "Revoke approval" : "Reject"}
              </button>
            )}

            {canApprove && (
              <button
                onClick={() => setConfirming("APPROVED")}
                disabled={deciding}
                className="rounded-lg bg-green-600 px-6 py-2 text-white hover:bg-green-700 disabled:opacity-60"
              >
                {status === "REJECTED" ? "Approve instead" : "Approve"}
              </button>
            )}
          </div>
        </div>
      </div>

      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">
              {confirming === "APPROVED" ? "Approve this teacher?" : "Reject this teacher?"}
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              {confirming === "APPROVED"
                ? `${teacherName} will be notified and can open their teacher dashboard.`
                : `${teacherName} will be notified and will not be able to open the teacher dashboard.`}
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setConfirming(null)}
                className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirm}
                className={`rounded-lg px-4 py-2 text-sm text-white ${
                  confirming === "APPROVED"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {confirming === "APPROVED" ? "Yes, approve" : "Yes, reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
