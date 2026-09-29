"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  useActivityLogs,
  type ActivityAction,
  type ActivityActorRole,
  type ActivityLogFiltersState,
  EMPTY_FILTERS,
} from "@/features/admin/hooks/useActivityLogs";
import ErrorBanner from "@/features/shared/components/ErrorBanner";

const ACTION_LABELS: Record<ActivityAction, string> = {
  AUTH_LOGIN: "Logged in",
  AUTH_LOGOUT: "Logged out",
  CLASS_SESSION_COMPLETED: "Class session completed",
  PAYMENT_ENROLLMENT: "Enrollment payment",
  PAYMENT_DEMO_BOOKING: "Demo booking payment",
  PAYMENT_WALLET_TOPUP: "Wallet top-up payment",
  WALLET_CREDITED_MANUAL: "Wallet credited (manual)",
  LEAVE_REQUEST_APPROVED: "Leave request approved",
  LEAVE_REQUEST_REJECTED: "Leave request rejected",
  ENROLLMENT_TEACHER_APPROVED: "Enrollment — teacher approved",
  ENROLLMENT_ADMIN_APPROVED: "Enrollment — admin approved",
  ENROLLMENT_REJECTED: "Enrollment rejected",
  TEACHER_APPROVED: "Teacher approved",
  TEACHER_REJECTED: "Teacher rejected",
  COURSE_APPROVED: "Course approved",
  COURSE_REJECTED: "Course rejected",
  USER_DELETED: "User deleted",
  BLOG_SUBMITTED: "Blog post submitted",
  BLOG_PUBLISHED: "Blog post published",
  BLOG_REJECTED: "Blog post rejected",
  GENERIC: "Other",
};

const ACTOR_ROLE_LABELS: Record<ActivityActorRole, string> = {
  PARENT: "Parent",
  TEACHER: "Teacher",
  ADMIN: "Admin",
  ACCOUNTS: "Accounts",
  HR: "HR",
  SYSTEM: "System",
};

const ACTION_BADGE_STYLES: Partial<Record<ActivityAction, string>> = {
  AUTH_LOGIN: "bg-green-100 text-green-700",
  AUTH_LOGOUT: "bg-gray-200 text-gray-600",
  CLASS_SESSION_COMPLETED: "bg-blue-100 text-blue-700",
  PAYMENT_ENROLLMENT: "bg-emerald-100 text-emerald-700",
  PAYMENT_DEMO_BOOKING: "bg-emerald-100 text-emerald-700",
  PAYMENT_WALLET_TOPUP: "bg-emerald-100 text-emerald-700",
  WALLET_CREDITED_MANUAL: "bg-emerald-100 text-emerald-700",
  LEAVE_REQUEST_APPROVED: "bg-teal-100 text-teal-700",
  LEAVE_REQUEST_REJECTED: "bg-red-100 text-red-700",
  ENROLLMENT_TEACHER_APPROVED: "bg-purple-100 text-purple-700",
  ENROLLMENT_ADMIN_APPROVED: "bg-purple-100 text-purple-700",
  ENROLLMENT_REJECTED: "bg-red-100 text-red-700",
  TEACHER_APPROVED: "bg-purple-100 text-purple-700",
  TEACHER_REJECTED: "bg-red-100 text-red-700",
  COURSE_APPROVED: "bg-purple-100 text-purple-700",
  COURSE_REJECTED: "bg-red-100 text-red-700",
  USER_DELETED: "bg-red-100 text-red-700",
  BLOG_SUBMITTED: "bg-blue-100 text-blue-700",
  BLOG_PUBLISHED: "bg-green-100 text-green-700",
  BLOG_REJECTED: "bg-red-100 text-red-700",
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminActivityLogsPage() {
  const router = useRouter();
  const {
    filters,
    applyFilters,
    resetFilters,
    page,
    setPage,
    totalPages,
    total,
    items,
    loading,
    error,
    downloadUrl,
  } = useActivityLogs();

  // Local draft state so filters only actually apply on "Apply" (or
  // Enter in the search box) rather than firing a request on every
  // keystroke.
  const [draft, setDraft] = useState<ActivityLogFiltersState>(filters);

  function handleApply(e: React.FormEvent) {
    e.preventDefault();
    applyFilters(draft);
  }

  function handleReset() {
    setDraft(EMPTY_FILTERS);
    resetFilters();
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <button
              onClick={() => router.push("/admin")}
              className="text-sm text-gray-500 hover:text-purple-600 mb-2"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-purple-600">Activity Log</h1>
            <p className="text-gray-500 mt-1">
              Major platform events — logins, payments, approvals, and more. {total} total.
            </p>
          </div>

          <a
            href={downloadUrl()}
            className="text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg px-4 py-2 h-fit"
          >
            Download CSV
          </a>
        </div>

        {/* Filters */}
        <form
          onSubmit={handleApply}
          className="bg-white border rounded-xl p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500">Action</label>
            <select
              value={draft.action}
              onChange={(e) =>
                setDraft((d) => ({ ...d, action: e.target.value as ActivityAction | "" }))
              }
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All actions</option>
              {(Object.keys(ACTION_LABELS) as ActivityAction[]).map((action) => (
                <option key={action} value={action}>
                  {ACTION_LABELS[action]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500">Role</label>
            <select
              value={draft.actorRole}
              onChange={(e) =>
                setDraft((d) => ({ ...d, actorRole: e.target.value as ActivityActorRole | "" }))
              }
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All roles</option>
              {(Object.keys(ACTOR_ROLE_LABELS) as ActivityActorRole[]).map((role) => (
                <option key={role} value={role}>
                  {ACTOR_ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500">From</label>
            <input
              type="date"
              value={draft.from}
              onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500">To</label>
            <input
              type="date"
              value={draft.to}
              onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500">Search</label>
            <input
              type="text"
              placeholder="Name, email, description..."
              value={draft.q}
              onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-5 flex gap-3 justify-end">
            <button
              type="button"
              onClick={handleReset}
              className="text-sm font-semibold text-gray-500 border rounded-lg px-4 py-2 hover:bg-gray-50"
            >
              Reset
            </button>
            <button
              type="submit"
              className="text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg px-5 py-2"
            >
              Apply filters
            </button>
          </div>
        </form>

        {error && <ErrorBanner>{error}</ErrorBanner>}

        <div className="bg-white border rounded-xl overflow-hidden">
          {loading ? (
            <p className="text-gray-500 p-8 text-center">Loading activity log...</p>
          ) : items.length === 0 ? (
            <p className="text-gray-500 p-8 text-center">No activity matches these filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Date / Time</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                    <th className="px-4 py-3 font-semibold">Actor</th>
                    <th className="px-4 py-3 font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                        {formatDateTime(row.createdAt)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            ACTION_BADGE_STYLES[row.action] || "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {ACTION_LABELS[row.action] || row.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium text-gray-800">
                          {row.actorName || "—"}
                        </div>
                        <div className="text-xs text-gray-400">
                          {ACTOR_ROLE_LABELS[row.actorRole]}
                          {row.actorEmail ? ` · ${row.actorEmail}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{row.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="text-sm font-semibold text-purple-600 disabled:text-gray-300 border rounded-lg px-4 py-2"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="text-sm font-semibold text-purple-600 disabled:text-gray-300 border rounded-lg px-4 py-2"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
