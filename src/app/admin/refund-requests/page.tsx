"use client";

import { useState } from "react";

import {
  useAdminRefundRequests,
  type AdminRefundRequest,
} from "@/features/refunds/hooks/useRefundRequests";
import {
  AdminDialog,
  AdminEmpty,
  AdminError,
  AdminFact,
  AdminLoading,
  AdminPage,
  AdminPageHeader,
  AdminPanel,
  AdminPill,
  AdminTabs,
  adminButtonClass,
  adminInputClass,
  adminLabelClass,
  adminTextareaClass,
  type PillTone,
} from "@/features/admin/components/ui/primitives";
import { REFUND_STATUS_LABELS } from "@/features/shared/utils/refundStatus";

/**
 * Admin "Refund requests" screen. A Parent's request waits here; Admin decides
 * whether to refund. Approve credits the Parent's Wallet for the amount Admin
 * types (nothing is calculated for him); Reject needs a note the Parent sees.
 * See `refundRequest.service.ts` and the Refund Policy (`/refunds`).
 */

type Tab = "PENDING" | "APPROVED" | "REJECTED";

const TABS: { value: Tab; label: string }[] = [
  { value: "PENDING", label: "To decide" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

const STATUS_TONE: Record<string, PillTone> = {
  PENDING: "warn",
  APPROVED: "good",
  REJECTED: "bad",
};

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});
const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export default function AdminRefundRequestsPage() {
  const { requests, loading, error, busyId, decide } = useAdminRefundRequests();
  const [tab, setTab] = useState<Tab>("PENDING");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [reject, setReject] = useState<AdminRefundRequest | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const counts = {
    PENDING: requests.filter((r) => r.status === "PENDING").length,
    APPROVED: requests.filter((r) => r.status === "APPROVED").length,
    REJECTED: requests.filter((r) => r.status === "REJECTED").length,
  };

  const visible = requests.filter((r) => r.status === tab);

  function amountFor(r: AdminRefundRequest) {
    return amounts[r.id] ?? "";
  }

  async function approve(r: AdminRefundRequest) {
    const amount = Number(amountFor(r));

    if (!Number.isFinite(amount) || amount <= 0) return;

    const note = (notes[r.id] ?? "").trim();

    await decide(r.id, "APPROVE", {
      approvedAmount: amount,
      ...(note ? { adminNote: note } : {}),
    });
  }

  function closeReject() {
    setReject(null);
    setRejectNote("");
  }

  async function confirmReject() {
    if (!reject || rejectNote.trim().length < 5) return;

    if (await decide(reject.id, "REJECT", { adminNote: rejectNote.trim() })) {
      closeReject();
    }
  }

  return (
    <AdminPage>
      <AdminPageHeader
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "Money" }]}
        title="Refund requests"
        description="Approve to credit the parent's wallet, or reject with a note. Nothing is refunded until you approve it."
      />

      <AdminTabs
        label="Request status"
        value={tab}
        onChange={setTab}
        tabs={TABS.map((t) => ({ ...t, count: counts[t.value] }))}
      />

      <AdminError>{error}</AdminError>

      {loading ? (
        <AdminLoading />
      ) : visible.length === 0 ? (
        <AdminEmpty message="Nothing here." />
      ) : (
        <div className="flex flex-col gap-4">
          {visible.map((r) => {
            const busy = busyId === r.id;

            return (
              <AdminPanel key={r.id} className="overflow-hidden">
                <article className="grid gap-0 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                  <div className="flex min-w-0 flex-col gap-4 p-5 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-lg font-extrabold">{r.parentName}</p>
                        <p className="truncate text-sm text-admin-muted">
                          {r.parentEmail} · requested {dateFmt.format(new Date(r.createdAt))}
                        </p>
                      </div>
                      <AdminPill tone={STATUS_TONE[r.status] ?? "neutral"}>
                        {REFUND_STATUS_LABELS[r.status] ?? r.status}
                      </AdminPill>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <AdminFact label="Amount paid">{currency.format(r.amountPaid)}</AdminFact>
                      <AdminFact label="Invoice">
                        {r.invoiceNumber}
                        <span className="block text-sm font-normal text-admin-muted">
                          paid {dateFmt.format(new Date(r.paidAt))}
                        </span>
                      </AdminFact>
                    </div>

                    <AdminFact label="Reason given">
                      <span className="whitespace-pre-line font-normal">{r.reason}</span>
                    </AdminFact>

                    {r.status === "APPROVED" && r.approvedAmount != null && (
                      <p className="text-[15px] font-bold text-green-800">
                        {currency.format(r.approvedAmount)} credited to wallet
                        {r.decidedByName ? ` by ${r.decidedByName}` : ""}.
                      </p>
                    )}

                    {r.adminNote && (
                      <p className="text-[15px] text-admin-muted">Note: {r.adminNote}</p>
                    )}
                  </div>

                  {r.status === "PENDING" && (
                    <div className="flex flex-col gap-4 border-t border-admin-line-soft bg-admin-surface p-5 sm:p-6 lg:border-l lg:border-t-0">
                      <div>
                        <label htmlFor={`amount-${r.id}`} className={adminLabelClass}>
                          Refund amount
                        </label>
                        <input
                          id={`amount-${r.id}`}
                          type="number"
                          inputMode="decimal"
                          min={1}
                          max={r.remainingRefundable}
                          step="1"
                          className={adminInputClass}
                          value={amountFor(r)}
                          onChange={(e) => setAmounts((prev) => ({ ...prev, [r.id]: e.target.value }))}
                        />
                        <span className="mt-1 block text-sm text-admin-muted">
                          Up to {currency.format(r.remainingRefundable)}.
                        </span>
                      </div>

                      <div>
                        <label htmlFor={`note-${r.id}`} className={adminLabelClass}>
                          Note for the parent{" "}
                          <span className="font-semibold text-admin-muted">(optional)</span>
                        </label>
                        <textarea
                          id={`note-${r.id}`}
                          rows={2}
                          maxLength={500}
                          className={adminTextareaClass}
                          value={notes[r.id] ?? ""}
                          onChange={(e) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy || !(Number(amountFor(r)) > 0)}
                          onClick={() => approve(r)}
                          className={adminButtonClass("primary")}
                        >
                          {busy ? "Working…" : "Approve and credit wallet"}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setReject(r)}
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
          })}
        </div>
      )}

      {reject && (
        <AdminDialog
          title="Reject refund request"
          subtitle={`${reject.parentName} — ${reject.description}`}
          onClose={closeReject}
          footer={
            <>
              <button type="button" onClick={closeReject} className={adminButtonClass("secondary")}>
                Cancel
              </button>
              <button
                type="button"
                disabled={busyId === reject.id || rejectNote.trim().length < 5}
                onClick={confirmReject}
                className={adminButtonClass("danger")}
              >
                Reject request
              </button>
            </>
          }
        >
          <label htmlFor="reject-note" className={adminLabelClass}>
            Reason (the parent will see this)
          </label>
          <textarea
            id="reject-note"
            className={`${adminTextareaClass} min-h-[90px]`}
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            maxLength={500}
          />
        </AdminDialog>
      )}
    </AdminPage>
  );
}
