"use client";

import { useState } from "react";

import { useAdminComplaints } from "@/features/admin/hooks/useComplaints";
import {
  AdminDialog,
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPage,
  AdminPageHeader,
  AdminPanel,
  AdminPill,
  AdminTabs,
  adminButtonClass,
  adminLabelClass,
  adminTextareaClass,
  formatAdminDate,
  type PillTone,
} from "@/features/admin/components/ui/primitives";
import {
  COMPLAINT_DEPARTMENT_LABELS,
  COMPLAINT_DEPARTMENTS,
  type ComplaintDepartmentValue,
} from "@/features/shared/utils/complaintDepartment";

const STATUS_TONE: Record<string, PillTone> = {
  OPEN: "warn",
  IN_PROGRESS: "brand",
  RESOLVED: "good",
  CLOSED: "neutral",
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

type PendingAction = {
  complaintId: string;
  action: "RESOLVE" | "CLOSE";
  subject: string;
};

interface ComplaintsBoardProps {
  /** Complaints API base, e.g. "/api/staff/complaints". */
  apiBase: string;
  /** Set for department staff: hides the department filter (their API is already scoped). */
  lockedDepartment?: ComplaintDepartmentValue;
  heading?: string;
  /**
   * True when rendered inside the Admin shell (which supplies the page
   * padding and breadcrumb). Staff dashboards (Accounts / HR / IT) leave
   * it off and get their own padded column.
   */
  embedded?: boolean;
}

type View = "open" | "all";

/**
 * Shared complaints list + actions, used by Admin (all departments) and by
 * Accounts / HR / IT (their own department only). Scoping is enforced by
 * the API; `lockedDepartment` only tweaks the UI.
 */
export default function ComplaintsBoard({
  apiBase,
  lockedDepartment,
  heading = "Complaints",
  embedded = false,
}: ComplaintsBoardProps) {
  const { complaints, loading, error, markInProgress, resolve, close } =
    useAdminComplaints(apiBase);
  const [view, setView] = useState<View>("open");
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

  const byStatus =
    view === "all"
      ? complaints
      : complaints.filter((c) => c.status === "OPEN" || c.status === "IN_PROGRESS");
  const visible =
    departmentFilter === "ALL" ? byStatus : byStatus.filter((c) => c.department === departmentFilter);
  const openCount = complaints.filter((c) => c.status === "OPEN").length;
  const isResolve = pendingAction?.action === "RESOLVE";

  const content = (
    <AdminPage>
      <AdminPageHeader
        crumbs={
          embedded
            ? [{ label: "Overview", href: "/admin" }, { label: "Classes and safety" }]
            : undefined
        }
        title={heading}
        description={`${openCount} open complaint${openCount === 1 ? "" : "s"} waiting on you.`}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <AdminTabs
          label="Complaint history"
          value={view}
          onChange={setView}
          tabs={[
            { value: "open", label: "Open", count: openCount },
            { value: "all", label: "All history" },
          ]}
        />

        {!lockedDepartment && (
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value as ComplaintDepartmentValue | "ALL")}
            className="h-11 rounded-xl border border-admin-line bg-white px-3.5 text-[15px] font-bold text-admin-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
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
      </div>

      <AdminError>{error}</AdminError>

      {loading ? (
        <AdminLoading message="Loading complaints…" />
      ) : visible.length === 0 ? (
        <AdminEmpty
          message={view === "all" ? "No complaints yet." : "Nothing waiting on your response."}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {visible.map((c) => (
            <AdminPanel key={c.id} padded>
              <article className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 flex-1 basis-80 flex-col gap-1">
                  <span className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-admin-muted">
                    {c.raiserRole}
                    {!lockedDepartment && c.department && (
                      <span className="ml-2 text-brand-dark">
                        → {COMPLAINT_DEPARTMENT_LABELS[c.department]}
                      </span>
                    )}
                  </span>
                  <span className="text-lg font-extrabold">{c.raiserName || "Unknown"}</span>
                  {c.raiserEmail && <span className="text-sm text-admin-muted">{c.raiserEmail}</span>}
                  <span className="mt-2 text-base font-extrabold">{c.subject}</span>
                  <span className="whitespace-pre-line text-[15px] text-admin-muted">{c.description}</span>
                  <span className="text-sm text-admin-muted">Raised {formatAdminDate(c.createdAt)}</span>
                  {c.adminNote && (
                    <span className="text-sm text-admin-muted">Your note: {c.adminNote}</span>
                  )}
                </div>

                <div className="flex flex-col items-end gap-3">
                  <AdminPill tone={STATUS_TONE[c.status] ?? "neutral"}>
                    {STATUS_LABEL[c.status] ?? c.status}
                  </AdminPill>

                  {(c.status === "OPEN" || c.status === "IN_PROGRESS") && (
                    <div className="flex flex-wrap justify-end gap-2">
                      {c.status === "OPEN" && (
                        <button
                          type="button"
                          onClick={() => markInProgress(c.id)}
                          className={adminButtonClass("secondary")}
                        >
                          Mark in progress
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setPendingAction({ complaintId: c.id, action: "RESOLVE", subject: c.subject })
                        }
                        className={adminButtonClass("primary")}
                      >
                        Resolve
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPendingAction({ complaintId: c.id, action: "CLOSE", subject: c.subject })
                        }
                        className={adminButtonClass("secondary")}
                      >
                        Close
                      </button>
                    </div>
                  )}
                </div>
              </article>
            </AdminPanel>
          ))}
        </div>
      )}

      {pendingAction && (
        <AdminDialog
          title={`${isResolve ? "Resolve" : "Close"} complaint`}
          subtitle={`“${pendingAction.subject}”`}
          onClose={closeModal}
          footer={
            <>
              <button type="button" onClick={closeModal} className={adminButtonClass("secondary")}>
                Cancel
              </button>
              <button type="button" onClick={confirmAction} className={adminButtonClass("primary")}>
                {isResolve ? "Resolve" : "Close"}
              </button>
            </>
          }
        >
          <label htmlFor="complaint-note" className={adminLabelClass}>
            Note for the raiser <span className="font-semibold text-admin-muted">(optional)</span>
          </label>
          <textarea
            id="complaint-note"
            autoFocus
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Let them know what happened"
            rows={3}
            maxLength={500}
            className={adminTextareaClass}
          />
        </AdminDialog>
      )}
    </AdminPage>
  );

  if (embedded) return content;

  return <div className="mx-auto min-h-screen max-w-5xl bg-admin-surface p-8 text-admin-ink">{content}</div>;
}
