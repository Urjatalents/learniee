"use client";

import { useState } from "react";

import {
  useActivityLogs,
  type ActivityAction,
  type ActivityActorRole,
  type ActivityLogFiltersState,
  EMPTY_FILTERS,
} from "@/features/admin/hooks/useActivityLogs";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";

import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPage,
  AdminPageHeader,
  AdminPanel,
  AdminTableCard,
  adminButtonClass,
  adminInputClass,
  adminLabelClass,
  adminRowClass,
  adminTableClass,
  adminTdClass,
  adminThClass,
} from "@/features/admin/components/ui/primitives";

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
  TEACHER_INTERVIEW_SCHEDULED: "Teacher interview scheduled",
  TEACHER_APPEALED: "Teacher appealed",
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
  TEACHER_INTERVIEW_SCHEDULED: "bg-purple-100 text-purple-700",
  TEACHER_APPEALED: "bg-amber-100 text-amber-700",
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
    <AdminPage>
      <AdminPageHeader
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "Records" }]}
        title="Activity log"
        description={`Major platform events: logins, payments, approvals, and more. ${total} total.`}
        actions={
          <a href={downloadUrl()} className={adminButtonClass("primary")}>
            <Download className="size-4" aria-hidden="true" />
            Download CSV
          </a>
        }
      />

      <AdminPanel padded>
        <form onSubmit={handleApply} aria-label="Filter activity" className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label htmlFor="fAction" className={adminLabelClass}>
                Action
              </label>
              <select
                id="fAction"
                value={draft.action}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, action: e.target.value as ActivityAction | "" }))
                }
                className={adminInputClass}
              >
                <option value="">All actions</option>
                {(Object.keys(ACTION_LABELS) as ActivityAction[]).map((action) => (
                  <option key={action} value={action}>
                    {ACTION_LABELS[action]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="fRole" className={adminLabelClass}>
                Role
              </label>
              <select
                id="fRole"
                value={draft.actorRole}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, actorRole: e.target.value as ActivityActorRole | "" }))
                }
                className={adminInputClass}
              >
                <option value="">All roles</option>
                {(Object.keys(ACTOR_ROLE_LABELS) as ActivityActorRole[]).map((role) => (
                  <option key={role} value={role}>
                    {ACTOR_ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="fFrom" className={adminLabelClass}>
                From
              </label>
              <input
                id="fFrom"
                type="date"
                value={draft.from}
                onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
                className={adminInputClass}
              />
            </div>

            <div>
              <label htmlFor="fTo" className={adminLabelClass}>
                To
              </label>
              <input
                id="fTo"
                type="date"
                value={draft.to}
                onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
                className={adminInputClass}
              />
            </div>

            <div>
              <label htmlFor="fQ" className={adminLabelClass}>
                Search
              </label>
              <input
                id="fQ"
                type="text"
                placeholder="Name, email, description…"
                value={draft.q}
                onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))}
                className={adminInputClass}
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" onClick={handleReset} className={adminButtonClass("secondary")}>
              Reset
            </button>
            <button type="submit" className={adminButtonClass("primary")}>
              Apply filters
            </button>
          </div>
        </form>
      </AdminPanel>

      <AdminError>{error}</AdminError>

      {loading ? (
        <AdminLoading message="Loading activity log…" />
      ) : items.length === 0 ? (
        <AdminEmpty message="No activity matches these filters." />
      ) : (
        <AdminTableCard>
          <table className={`${adminTableClass} min-w-[760px]`}>
            <thead>
              <tr>
                <th className={adminThClass}>Date and time</th>
                <th className={adminThClass}>Action</th>
                <th className={adminThClass}>Actor</th>
                <th className={adminThClass}>Description</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className={adminRowClass}>
                  <td className={`${adminTdClass} whitespace-nowrap text-admin-muted`}>
                    {formatDateTime(row.createdAt)}
                  </td>
                  <td className={`${adminTdClass} whitespace-nowrap`}>
                    <span
                      className={`rounded-full px-2.5 py-[3px] text-sm font-extrabold ${
                        ACTION_BADGE_STYLES[row.action] || "bg-admin-surface text-admin-muted"
                      }`}
                    >
                      {ACTION_LABELS[row.action] || row.action}
                    </span>
                  </td>
                  <td className={adminTdClass}>
                    <div className="font-extrabold">{row.actorName || "—"}</div>
                    <div className="text-sm text-admin-muted">
                      {ACTOR_ROLE_LABELS[row.actorRole]}
                      {row.actorEmail ? ` · ${row.actorEmail}` : ""}
                    </div>
                  </td>
                  <td className={adminTdClass}>{row.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTableCard>
      )}

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className={adminButtonClass("secondary")}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            Previous
          </button>
          <span className="text-[15px] font-bold text-admin-muted">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className={adminButtonClass("secondary")}
          >
            Next
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </nav>
      )}
    </AdminPage>
  );
}
