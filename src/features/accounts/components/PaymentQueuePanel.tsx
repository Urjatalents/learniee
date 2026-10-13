"use client";

import { useState } from "react";

import { usePaymentQueue } from "@/features/accounts/hooks/usePaymentQueue";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/**
 * Accounts' Payment Queue tab (Teacher Payouts, Sep 9, 2026) — every
 * teacher with at least one Proceeded cycle, one row per teacher
 * (not per cycle), with a checkbox and a "Pay Selected" mass-pay
 * action. A teacher with no bank account on file is shown but can't
 * be selected — mass-paying skips them automatically rather than
 * failing the whole batch, so this is really just making that
 * up-front instead of surprising after the fact.
 */
export default function PaymentQueuePanel() {
  const { groups, loading, error, paying, lastResult, payTeachers } = usePaymentQueue();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const payable = groups.filter((g) => g.hasBankAccount);
  const allPayableSelected = payable.length > 0 && payable.every((g) => selected.has(g.teacherId));
  const selectedTotal = groups
    .filter((g) => selected.has(g.teacherId))
    .reduce((s, g) => s + g.totalAmount, 0);

  function toggle(teacherId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(teacherId)) next.delete(teacherId);
      else next.add(teacherId);
      return next;
    });
  }

  function toggleAll() {
    if (allPayableSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(payable.map((g) => g.teacherId)));
    }
  }

  async function handlePay() {
    if (selected.size === 0) return;
    const ok = await payTeachers(Array.from(selected));
    if (ok) setSelected(new Set());
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Payment Queue</h2>
          <p className="text-xs text-gray-400 mt-1">
            Grouped by teacher — select several and pay them all at once instead of one cycle at a
            time. Pay sends the transfer through RazorpayX; cycles show as Processing until the bank
            confirms, and return to this queue if the transfer fails.
          </p>
        </div>
        <button
          disabled={selected.size === 0 || paying}
          onClick={handlePay}
          className="shrink-0 bg-brand hover:bg-brand-dark text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50"
        >
          {paying ? "Paying…" : `Pay Selected${selected.size ? ` (${selected.size})` : ""}`}
        </button>
      </div>

      {selected.size > 0 && (
        <div className="px-6 py-2 text-sm bg-blue-50 border-b text-blue-800">
          {selected.size} teacher{selected.size === 1 ? "" : "s"} selected — {currency.format(selectedTotal)} total
        </div>
      )}

      {error && <div className="px-6 py-3 text-sm text-red-600 bg-red-50 border-b">{error}</div>}

      {lastResult && (
        <div className="px-6 py-3 text-sm bg-green-50 border-b text-green-800">
          Sent {lastResult.paidTeacherIds.length + lastResult.processingTeacherIds.length} teacher(s), {currency.format(lastResult.totalAmount)} total.
          {lastResult.processingTeacherIds.length > 0 && (
            <> {lastResult.processingTeacherIds.length} awaiting bank confirmation.</>
          )}
          {lastResult.failedTeacherIds.length > 0 && (
            <> {lastResult.failedTeacherIds.length} failed — back in the queue.</>
          )}
          {lastResult.skippedTeacherIds.length > 0 && (
            <> {lastResult.skippedTeacherIds.length} skipped — no bank account on file.</>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead className="bg-gray-100 text-left text-gray-600">
            <tr>
              <th className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={allPayableSelected}
                  onChange={toggleAll}
                  disabled={payable.length === 0}
                />
              </th>
              <th className="px-3 py-3">Teacher</th>
              <th className="px-3 py-3 text-right">Cycles Queued</th>
              <th className="px-3 py-3 text-right">Total Payable</th>
              <th className="px-3 py-3">Bank Account</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && groups.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Nothing queued for payment right now — Proceed a cycle in the Verify tab first.
                </td>
              </tr>
            )}
            {groups.map((g) => (
              <tr key={g.teacherId} className="border-t">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(g.teacherId)}
                    onChange={() => toggle(g.teacherId)}
                    disabled={!g.hasBankAccount}
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="font-medium text-gray-800">{g.teacherName}</div>
                  <div className="text-xs text-gray-400">{g.email}</div>
                </td>
                <td className="px-3 py-2 text-right">{g.cycleCount}</td>
                <td className="px-3 py-2 text-right font-medium">{currency.format(g.totalAmount)}</td>
                <td className="px-3 py-2">
                  {g.bankAccountStatus === "APPROVED" && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      Approved
                    </span>
                  )}
                  {g.bankAccountStatus === "PENDING" && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      Awaiting Admin approval
                    </span>
                  )}
                  {g.bankAccountStatus === "REJECTED" && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                      Rejected — can&apos;t pay yet
                    </span>
                  )}
                  {g.bankAccountStatus === "NONE" && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                      Missing — can&apos;t pay yet
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
