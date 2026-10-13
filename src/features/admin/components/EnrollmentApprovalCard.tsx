"use client";

import Link from "next/link";
import { useState } from "react";
import { Info, MessageCircle, TriangleAlert } from "lucide-react";

import type { AdminEnrollment } from "@/features/admin/hooks/useEnrollments";
import {
  AdminPanel,
  AdminPill,
  adminButtonClass,
  adminInputClass,
  adminLabelClass,
} from "@/features/admin/components/ui/primitives";

interface Props {
  enrollment: AdminEnrollment;
  onApprove: (id: string) => void;
  onReject: (id: string, reason?: string) => void;
}

function displayName(p: { firstName: string; lastName: string; visibleName?: string | null }) {
  return p.visibleName?.trim() || `${p.firstName} ${p.lastName}`.trim();
}

function Facts({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-admin-muted">
            {item.label}
          </dt>
          <dd className="text-base font-bold break-words">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function EnrollmentApprovalCard({ enrollment, onApprove, onReject }: Props) {
  const [reason, setReason] = useState("");

  return (
    <AdminPanel className="overflow-hidden">
      <article className="grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="font-heading text-xl font-bold">
              {enrollment.course.courseTitle ?? "Untitled course"}
            </h2>
            <AdminPill tone="warn">Enrollment pending</AdminPill>
          </div>

          <Facts
            items={[
              { label: "Parent", value: displayName(enrollment.parent) },
              { label: "Teacher", value: displayName(enrollment.teacher) },
              {
                label: "Child",
                value: enrollment.student.visibleName || enrollment.student.firstName,
              },
            ]}
          />

          <Facts
            items={[
              { label: "Sessions a month", value: String(enrollment.sessionsPerMonth) },
              { label: "Months", value: String(enrollment.noOfMonths) },
              {
                label: "Start",
                value: new Date(enrollment.cycleStartDate).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }),
              },
              { label: "Total paid", value: `₹${enrollment.amountPaid}` },
            ]}
          />

          {enrollment.revisedByTeacher && (
            <div
              role="note"
              className="flex gap-3 rounded-[14px] border border-admin-line bg-admin-tint px-4 py-3"
            >
              <Info className="mt-0.5 size-5 shrink-0 text-brand-dark" aria-hidden="true" />
              <span className="text-[15px]">
                Teacher revised this enrollment before forwarding it. The parent has confirmed.
                {enrollment.revisionNote && (
                  <>
                    {" "}
                    <span className="font-extrabold">Note:</span> {enrollment.revisionNote}
                  </>
                )}
              </span>
            </div>
          )}

          {enrollment.pricingChangedAfterPayment && (
            <div
              role="alert"
              className="flex gap-3 rounded-[14px] border border-[#f4c01e] bg-[#fff8dc] px-4 py-3"
            >
              <TriangleAlert className="mt-0.5 size-5 shrink-0 text-[#8a6500]" aria-hidden="true" />
              <span className="text-[15px]">
                <span className="font-extrabold">Amounts do not match.</span> The revised total (₹
                {enrollment.totalAmount}) differs from what was charged (₹{enrollment.amountPaid}).
                No automatic charge or refund was made. Reconcile manually before approving.
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 border-t border-admin-line-soft bg-admin-surface p-5 sm:p-6 lg:border-l lg:border-t-0">
          <div>
            <label htmlFor={`reject-${enrollment.id}`} className={adminLabelClass}>
              Reason for rejecting{" "}
              <span className="font-semibold text-admin-muted">(optional)</span>
            </label>
            <input
              id={`reject-${enrollment.id}`}
              type="text"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className={adminInputClass}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onApprove(enrollment.id)}
              className={adminButtonClass("primary")}
            >
              Approve enrollment
            </button>
            <button
              type="button"
              onClick={() => onReject(enrollment.id, reason.trim() || undefined)}
              className={adminButtonClass("secondary", "text-red-700")}
            >
              Reject
            </button>
          </div>

          {enrollment.chatRoom && (
            <Link
              href={`/admin/chat/${enrollment.chatRoom.id}`}
              className={adminButtonClass("ghost", "self-start")}
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              View conversation
            </Link>
          )}
        </div>
      </article>
    </AdminPanel>
  );
}
