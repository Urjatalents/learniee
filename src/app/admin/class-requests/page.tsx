"use client";

import { useState } from "react";

import { formatSchedule } from "@/features/shared/utils/weekdays";
import {
  useAdminClassRequests,
  type AdminClassRequest,
} from "@/features/class-requests/hooks/useClassRequests";
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
  type PillTone,
} from "@/features/admin/components/ui/primitives";
import {
  CLASS_REQUEST_STATUS_LABELS,
  formatClassRequestDate,
} from "@/features/shared/utils/classRequestStatus";

/**
 * Admin "Class requests" screen. Vets parents' custom class requests:
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

const STATUS_TONE: Record<string, PillTone> = {
  PENDING_REVIEW: "warn",
  OPEN: "brand",
  REJECTED: "dark",
  CLOSED: "neutral",
};

function teacherName(t: { firstName: string; lastName: string; visibleName: string | null }) {
  return t.visibleName || `${t.firstName} ${t.lastName}`.trim();
}

export default function AdminClassRequestsPage() {
  const { requests, loading, error, busyId, act } = useAdminClassRequests();
  const [tab, setTab] = useState<Tab>("PENDING_REVIEW");
  const [pending, setPending] = useState<{
    request: AdminClassRequest;
    action: "REJECT" | "CLOSE";
  } | null>(null);
  const [note, setNote] = useState("");

  const counts = {
    PENDING_REVIEW: requests.filter((r) => r.status === "PENDING_REVIEW").length,
    OPEN: requests.filter((r) => r.status === "OPEN").length,
    DONE: requests.filter((r) => r.status === "REJECTED" || r.status === "CLOSED").length,
  };

  const visible = requests.filter((r) =>
    tab === "DONE" ? r.status === "REJECTED" || r.status === "CLOSED" : r.status === tab,
  );

  function closeDialog() {
    setPending(null);
    setNote("");
  }

  async function confirm() {
    if (!pending) return;

    if (pending.action === "REJECT" && !note.trim()) return;

    if (await act(pending.request.id, pending.action, note.trim() || undefined)) {
      closeDialog();
    }
  }

  return (
    <AdminPage>
      <AdminPageHeader
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "Classes and safety" }]}
        title="Class requests"
        description="Custom classes parents asked for. Approve to share with teachers as a vacancy."
      />

      <div>
        <AdminTabs
          label="Request status"
          value={tab}
          onChange={setTab}
          tabs={TABS.map((t) => ({ ...t, count: counts[t.value] }))}
        />
      </div>

      <AdminError>{error}</AdminError>

      {loading ? (
        <AdminLoading />
      ) : visible.length === 0 ? (
        <AdminEmpty message="Nothing here." />
      ) : (
        <div className="flex flex-col gap-4">
          {visible.map((r) => {
            const busy = busyId === r.id;
            const accepted = r.responses.filter((x) => x.status === "ACCEPTED");
            const declined = r.responses.length - accepted.length;
            const tags = [r.subject, r.grade, r.board, r.language].filter(Boolean) as string[];
            const facts = [
              r.sessionsPerWeek ? `${r.sessionsPerWeek} class(es)/week` : null,
              r.preferredDays.length > 0
                ? `Schedule: ${formatSchedule(r.preferredDays, r.preferredTime)} (IST)`
                : r.preferredSchedule
                  ? `Timings: ${r.preferredSchedule}`
                  : null,
              r.pricePerSession ? `Fixed price ₹${r.pricePerSession}/hour` : null,
            ].filter(Boolean) as string[];

            return (
              <AdminPanel key={r.id} padded>
                <article className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h2 className="font-heading text-xl font-bold">{r.title}</h2>
                    <AdminPill tone={STATUS_TONE[r.status] ?? "neutral"}>
                      {CLASS_REQUEST_STATUS_LABELS[r.status] ?? r.status}
                    </AdminPill>
                  </div>

                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <AdminPill key={tag}>{tag}</AdminPill>
                      ))}
                    </div>
                  )}

                  <p className="text-[15px] text-admin-muted">
                    By {r.parentName} ({r.parentEmail})
                    {r.studentName ? ` for ${r.studentName}` : ""},{" "}
                    {formatClassRequestDate(r.createdAt)}
                  </p>

                  <p className="whitespace-pre-line text-base">{r.description}</p>

                  {facts.length > 0 && (
                    <p className="text-[15px] font-bold">{facts.join(" · ")}</p>
                  )}

                  {r.adminNote && <p className="text-[15px] text-admin-muted">Note: {r.adminNote}</p>}

                  {r.status !== "PENDING_REVIEW" && r.responses.length > 0 && (
                    <div className="flex flex-col gap-1 border-t border-admin-line-soft pt-3 text-[15px]">
                      <span className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-admin-muted">
                        Teacher responses: {accepted.length} accepted, {declined} declined
                      </span>
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

                  {(r.status === "PENDING_REVIEW" || r.status === "OPEN") && (
                    <div className="flex flex-wrap gap-2 border-t border-admin-line-soft pt-4">
                      {r.status === "PENDING_REVIEW" && (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => act(r.id, "APPROVE")}
                            className={adminButtonClass("primary")}
                          >
                            {busy ? "Working…" : "Approve and share with teachers"}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setPending({ request: r, action: "REJECT" })}
                            className={adminButtonClass("secondary", "text-red-700")}
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
                          className={adminButtonClass("secondary")}
                        >
                          Close vacancy
                        </button>
                      )}
                    </div>
                  )}
                </article>
              </AdminPanel>
            );
          })}
        </div>
      )}

      {pending && (
        <AdminDialog
          title={pending.action === "REJECT" ? "Reject request" : "Close vacancy"}
          subtitle={`“${pending.request.title}”`}
          onClose={closeDialog}
          footer={
            <>
              <button type="button" onClick={closeDialog} className={adminButtonClass("secondary")}>
                Cancel
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={pending.action === "REJECT" && !note.trim()}
                className={adminButtonClass("primary")}
              >
                Confirm
              </button>
            </>
          }
        >
          <label htmlFor="class-request-note" className={adminLabelClass}>
            {pending.action === "REJECT"
              ? "Reason for the parent (required)"
              : "Note for the parent (optional)"}
          </label>
          <textarea
            id="class-request-note"
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={500}
            className={adminTextareaClass}
          />
        </AdminDialog>
      )}
    </AdminPage>
  );
}
