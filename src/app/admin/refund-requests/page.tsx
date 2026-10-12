"use client";

import { useState } from "react";

import {
  useAdminRefundRequests,
  type AdminRefundRequest,
} from "@/features/refunds/hooks/useRefundRequests";
import ErrorBanner from "@/features/shared/components/ErrorBanner";
import { REFUND_STATUS_LABELS, getRefundStatusStyle } from "@/features/shared/utils/refundStatus";

/**
 * Admin "Refund Requests" screen. A Parent's request waits here; Admin decides
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

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const inputClass =
  "w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 outline-none text-sm text-gray-800 focus:border-purple-400";

export default function AdminRefundRequestsPage() {
  const { requests, loading, error, busyId, decide } = useAdminRefundRequests();
  const [tab, setTab] = useState<Tab>("PENDING");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [reject, setReject] = useState<AdminRefundRequest | null>(null);
  const [note, setNote] = useState("");

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

    await decide(r.id, "APPROVE", { approvedAmount: amount });
  }

  async function confirmReject() {
    if (!reject || note.trim().length < 5) return;

    if (await decide(reject.id, "REJECT", { adminNote: note.trim() })) {
      setReject(null);
      setNote("");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800">Refund Requests</h1>
        <p className="text-sm text-gray-500 mt-1 mb-6">
          Nothing is refunded until you approve it. Enter the refund amount yourself; it is credited to the parent&apos;s wallet.
        </p>

        {error && <ErrorBanner>{error}</ErrorBanner>}

        <div className="flex gap-2 mb-6">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={`text-sm font-semibold px-4 py-2 rounded-lg ${
                tab === t.value ? "bg-purple-600 text-white" : "bg-white border text-gray-600 hover:bg-gray-100"
              }`}
            >
              {t.label} ({counts[t.value]})
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : visible.length === 0 ? (
          <div className="bg-white border rounded-xl p-10 text-center text-sm text-gray-500">Nothing here.</div>
        ) : (
          <div className="space-y-4">
            {visible.map((r) => {
              const busy = busyId === r.id;

              return (
                <article key={r.id} className="bg-white border rounded-xl shadow-sm p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-semibold text-gray-800">{r.description}</h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {r.parentName} ({r.parentEmail}) · requested {dateFmt.format(new Date(r.createdAt))}
                      </p>
                      <p className="text-xs text-gray-500">
                        Invoice {r.invoiceNumber} · paid {dateFmt.format(new Date(r.paidAt))}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${getRefundStatusStyle(r.status)}`}>
                      {REFUND_STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mt-3 whitespace-pre-line">{r.reason}</p>

                  <p className="text-xs text-gray-500 mt-3">Paid {currency.format(r.amountPaid)}</p>

                  {r.status === "APPROVED" && r.approvedAmount != null && (
                    <p className="text-sm text-green-700 mt-2">
                      {currency.format(r.approvedAmount)} credited to wallet
                      {r.decidedByName ? ` by ${r.decidedByName}` : ""}.
                    </p>
                  )}

                  {r.adminNote && <p className="mt-2 text-sm text-gray-600">Note: {r.adminNote}</p>}

                  {r.status === "PENDING" && (
                    <div className="mt-4 flex flex-wrap items-end gap-3">
                      <label className="text-xs text-gray-500">
                        Refund amount (max {currency.format(r.remainingRefundable)})
                        <input
                          type="number"
                          min={1}
                          max={r.remainingRefundable}
                          step="1"
                          className={`${inputClass} mt-1 w-44`}
                          value={amountFor(r)}
                          onChange={(e) => setAmounts((prev) => ({ ...prev, [r.id]: e.target.value }))}
                        />
                      </label>
                      <button
                        type="button"
                        disabled={busy || !(Number(amountFor(r)) > 0)}
                        onClick={() => approve(r)}
                        className="text-sm font-bold text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg disabled:opacity-60"
                      >
                        {busy ? "Working..." : "Approve & credit wallet"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setReject(r)}
                        className="text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 px-4 py-2 rounded-lg"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      {reject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => {
            setReject(null);
            setNote("");
          }}
        >
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-800">Reject refund request</h2>
            <p className="text-sm text-gray-500 mt-1 truncate">
              {reject.parentName} — {reject.description}
            </p>
            <label className="block text-sm text-gray-600 mt-4">
              Reason (the parent will see this)
              <textarea
                className={`${inputClass} mt-1 min-h-[90px]`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setReject(null);
                  setNote("");
                }}
                className="text-sm font-semibold text-gray-600 border px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyId === reject.id || note.trim().length < 5}
                onClick={confirmReject}
                className="text-sm font-bold text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg disabled:opacity-60"
              >
                Reject request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
