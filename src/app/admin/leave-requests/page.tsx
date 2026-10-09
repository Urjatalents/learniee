"use client";

import { useState } from "react";

import { useAdminLeaveRequests } from "@/features/admin/hooks/useLeaveRequests";
import ErrorBanner from "@/features/shared/components/ErrorBanner";
import { getLeaveRequestStatusStyle } from "@/features/shared/utils/leaveRequestStatus";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function teacherName(t: { firstName: string; lastName: string; visibleName: string | null }) {
  return t.visibleName?.trim() || `${t.firstName} ${t.lastName}`.trim();
}

export default function AdminLeaveRequestsPage() {
  const { requests, loading, error, approve, reject } = useAdminLeaveRequests();
  const [showResolved, setShowResolved] = useState(false);

  const visible = showResolved ? requests : requests.filter((r) => r.status === "PENDING");
  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-purple-600">Leave Requests</h1>
            <p className="text-gray-500 mt-1">
              {pendingCount} pending request{pendingCount === 1 ? "" : "s"} waiting on you.
            </p>
          </div>

          <button
            onClick={() => setShowResolved((v) => !v)}
            className="text-sm font-semibold text-purple-600 border border-purple-200 rounded-lg px-4 py-2 hover:bg-purple-50"
          >
            {showResolved ? "Show pending only" : "Show all history"}
          </button>
        </div>

        {error && (
          <ErrorBanner>{error}</ErrorBanner>
        )}

        {loading ? (
          <p className="text-gray-500">Loading leave requests...</p>
        ) : visible.length === 0 ? (
          <div className="bg-white border rounded-xl p-8 text-center">
            <p className="text-gray-500">
              {showResolved ? "No leave requests yet." : "Nothing waiting on your approval."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((r) => (
              <div
                key={r.id}
                className="bg-white border rounded-xl p-6 shadow-sm flex items-start justify-between gap-4 flex-wrap"
              >
                <div>
                  <p className="text-lg font-semibold text-gray-800">
                    {teacherName(r.teacher)}
                    {r.isEmergency && (
                      <span className="ml-2 align-middle text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                        Emergency
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500">{r.teacher.email}</p>
                  <p className="text-sm text-gray-700 mt-2">
                    {formatDate(r.startDate)} – {formatDate(r.endDate)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">{r.reason}</p>
                  {r.status === "PENDING" && r.impact && (
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
                      If approved: {r.impact.moving} class{r.impact.moving === 1 ? "" : "es"} will
                      move to a new slot
                      {r.impact.cancelling > 0 && (
                        <>
                          , <strong>{r.impact.cancelling}</strong> will be cancelled (no free slot
                          in the 45-day window)
                        </>
                      )}
                      {r.impact.tooSoon > 0 && (
                        <>
                          ; {r.impact.tooSoon} starting in under 4 hours can&apos;t be moved
                          (normal teacher cancel rules apply)
                        </>
                      )}
                      .
                    </p>
                  )}
                  {r.adminNote && (
                    <p className="text-xs text-gray-400 mt-1">Your note: {r.adminNote}</p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-3">
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${
                      getLeaveRequestStatusStyle(r.status)
                    }`}
                  >
                    {r.status}
                  </span>

                  {r.status === "PENDING" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => approve(r.id)}
                        className="text-sm font-bold text-green-700 bg-green-50 hover:bg-green-100 px-4 py-2 rounded-lg"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() =>
                          reject(r.id, window.prompt("Reason (optional):") || undefined)
                        }
                        className="text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
