"use client";

import { useState } from "react";
import { Check, Clock, X } from "lucide-react";

import {
  AdminPanel,
  AdminPill,
  adminButtonClass,
  adminInputClass,
  adminLabelClass,
  formatAdminDate,
  type PillTone,
} from "@/features/admin/components/ui/primitives";

export interface BankAccountRow {
  id: string;
  teacherName: string;
  email: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string | null;
  branchName: string | null;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
}

// Masks all but the last 4 digits — the underlying value is still
// plain text at rest (06-OPEN-DECISIONS.md #47, unresolved), but
// there's no reason for this list view to display the full number
// when only the last 4 are ever needed to sanity-check a submission.
function maskAccountNumber(accountNumber: string) {
  if (accountNumber.length <= 4) return accountNumber;
  return `••••${accountNumber.slice(-4)}`;
}

const STATUS: Record<string, { label: string; tone: PillTone; Icon: typeof Clock }> = {
  PENDING: { label: "Pending", tone: "warn", Icon: Clock },
  APPROVED: { label: "Approved", tone: "brand", Icon: Check },
  REJECTED: { label: "Rejected", tone: "dark", Icon: X },
};

export default function BankAccountCard({
  account,
  onApprove,
  onReject,
}: {
  account: BankAccountRow;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const status = STATUS[account.status] ?? { label: account.status, tone: "neutral" as PillTone, Icon: Clock };
  const StatusIcon = status.Icon;
  const bankLine = account.bankName
    ? `${account.bankName}${account.branchName ? `, ${account.branchName}` : ""}`
    : "—";

  const fields = [
    { label: "Account holder", value: account.accountHolderName },
    { label: "Account number", value: maskAccountNumber(account.accountNumber) },
    { label: "IFSC", value: account.ifscCode },
    { label: "Bank", value: bankLine },
  ];

  return (
    <AdminPanel className="overflow-hidden">
      <article className="grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col">
              <span className="text-lg font-extrabold">{account.teacherName}</span>
              <span className="truncate text-sm text-admin-muted">{account.email}</span>
            </div>
            <AdminPill tone={status.tone}>
              <StatusIcon className="size-3.5" aria-hidden="true" />
              {status.label}
            </AdminPill>
          </div>

          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.label} className="flex min-w-0 flex-col gap-0.5">
                <dt className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-admin-muted">
                  {field.label}
                </dt>
                <dd className="text-base font-bold break-words">{field.value}</dd>
              </div>
            ))}
          </dl>

          <span className="text-sm text-admin-muted">
            Submitted {formatAdminDate(account.createdAt)}
            {account.reviewedAt && ` · Reviewed ${formatAdminDate(account.reviewedAt)}`}
          </span>

          {account.rejectionReason && (
            <div role="note" className="rounded-[14px] bg-admin-surface px-4 py-3 text-[15px]">
              <span className="font-extrabold">Rejection reason:</span> {account.rejectionReason}
            </div>
          )}
        </div>

        {account.status === "PENDING" && (
          <div className="flex flex-col gap-4 border-t border-admin-line-soft bg-admin-surface p-5 sm:p-6 lg:border-l lg:border-t-0">
            <div>
              <label htmlFor={`bank-reason-${account.id}`} className={adminLabelClass}>
                Reason for rejecting
              </label>
              <input
                id={`bank-reason-${account.id}`}
                type="text"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className={adminInputClass}
              />
              <span className="mt-1 block text-sm text-admin-muted">
                Required to reject these bank details.
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onApprove(account.id)}
                className={adminButtonClass("primary")}
              >
                Approve
              </button>
              <button
                type="button"
                disabled={!reason.trim()}
                onClick={() => onReject(account.id, reason.trim())}
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
