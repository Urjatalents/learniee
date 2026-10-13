"use client";

import { useState } from "react";

import {
  AdminAvatar,
  AdminFact,
  AdminPanel,
  AdminPill,
  adminButtonClass,
  adminInputClass,
  adminLabelClass,
  formatAdminDate,
  type PillTone,
} from "@/features/admin/components/ui/primitives";

export interface LeaveRequestRow {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  reason: string;
  adminNote: string | null;
  isEmergency?: boolean;
  teacher: { firstName: string; lastName: string; visibleName: string | null; email: string };
  impact?: { moving: number; excused: number; tooSoon: number } | null;
}

const STATUS_TONE: Record<string, PillTone> = {
  PENDING: "warn",
  APPROVED: "brand",
  REJECTED: "dark",
  CANCELLED: "neutral",
};

function teacherName(t: LeaveRequestRow["teacher"]) {
  return t.visibleName?.trim() || `${t.firstName} ${t.lastName}`.trim();
}

function ImpactText({ impact }: { impact: NonNullable<LeaveRequestRow["impact"]> }) {
  return (
    <>
      {impact.moving} class{impact.moving === 1 ? "" : "es"} will move to a new slot
      {impact.excused > 0 && (
        <>
          , <strong>{impact.excused}</strong> will be marked excused (no free slot in the 45-day
          window; a make-up is looked for after the leave)
        </>
      )}
      {impact.tooSoon > 0 && (
        <>
          ; {impact.tooSoon} starting in under 4 hours can&apos;t be moved (normal teacher cancel
          rules apply)
        </>
      )}
      .
    </>
  );
}

export default function LeaveRequestCard({
  request,
  onApprove,
  onReject,
}: {
  request: LeaveRequestRow;
  onApprove: (id: string) => void;
  onReject: (id: string, reason?: string) => void;
}) {
  const [reason, setReason] = useState("");
  const name = teacherName(request.teacher);
  const pending = request.status === "PENDING";

  return (
    <AdminPanel className="overflow-hidden">
      <article className="grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <AdminAvatar name={name} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-lg font-extrabold">{name}</span>
              <span className="truncate text-sm text-admin-muted">{request.teacher.email}</span>
            </div>
            {request.isEmergency && <AdminPill tone="bad">Emergency</AdminPill>}
            <AdminPill tone={STATUS_TONE[request.status] ?? "neutral"}>
              {request.status.charAt(0) + request.status.slice(1).toLowerCase()}
            </AdminPill>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <AdminFact label="Leave dates">
              {formatAdminDate(request.startDate)} – {formatAdminDate(request.endDate)}
            </AdminFact>
            <AdminFact label="Reason">
              <span className="font-normal">{request.reason}</span>
            </AdminFact>
          </div>

          {pending && request.impact && (
            <div className="flex flex-col gap-0.5 rounded-[14px] border border-[#f4c01e] bg-[#fff8dc] px-4 py-3">
              <span className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-admin-muted">
                If approved
              </span>
              <span className="text-[15px]">
                <ImpactText impact={request.impact} />
              </span>
            </div>
          )}

          {request.adminNote && (
            <p className="text-sm text-admin-muted">Your note: {request.adminNote}</p>
          )}
        </div>

        {pending && (
          <div className="flex flex-col gap-4 border-t border-admin-line-soft bg-admin-surface p-5 sm:p-6 lg:border-l lg:border-t-0">
            <div>
              <label htmlFor={`leave-note-${request.id}`} className={adminLabelClass}>
                Reason for rejecting{" "}
                <span className="font-semibold text-admin-muted">(optional)</span>
              </label>
              <input
                id={`leave-note-${request.id}`}
                type="text"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className={adminInputClass}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onApprove(request.id)}
                className={adminButtonClass("primary")}
              >
                Approve leave
              </button>
              <button
                type="button"
                onClick={() => onReject(request.id, reason.trim() || undefined)}
                className={adminButtonClass("secondary", "text-red-700")}
              >
                Reject
              </button>
            </div>
          </div>
        )}
      </article>
    </AdminPanel>
  );
}
