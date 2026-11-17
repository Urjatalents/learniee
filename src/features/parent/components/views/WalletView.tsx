"use client";

import { useState } from "react";
import { FileText, Plus, Wallet } from "lucide-react";

import { PD_BTN_PRI, PdEmpty } from "@/features/parent/components/courses/pdUi";
import { usePdToast } from "@/features/parent/components/courses/usePdToast";
import AddMoneyDialog from "@/features/parent/components/payments/AddMoneyDialog";
import {
  PD_CARD,
  PD_CARD_FLUSH,
  PD_COL,
  PD_PGRID,
  PD_SECTION_H,
  PdBanner,
  PdSkeleton,
  dTime,
  inr2,
} from "@/features/parent/components/payments/paymentsUi";
import { useWallet } from "@/features/parent/hooks/useWallet";

/**
 * Wallet tab — balance, "Add money" (Razorpay top-up with GST / UPI charge, via `useWallet().addMoney`)
 * and the transaction history from /api/parent/wallet.
 */
export default function WalletView() {
  const { balance, transactions, loading, error, addingMoney, addMoney } = useWallet();
  const { toast, toastNode } = usePdToast();
  const [adding, setAdding] = useState(false);
  const [failure, setFailure] = useState("");

  async function pay(amount: number) {
    // Close the dialog first: the payment-method prompt and Razorpay Checkout open on top of the page.
    setAdding(false);
    setFailure("");
    const result = await addMoney(amount);

    if (result.ok) toast(result.message);
    else setFailure(result.message);
  }

  return (
    <div className={PD_PGRID}>
      <div className={PD_COL}>
        <section>
          <h2 className={PD_SECTION_H}>Transaction history</h2>
          {(error || failure) && (
            <div className="mb-3">
              <PdBanner tone="red">{failure || error}</PdBanner>
            </div>
          )}
          <div className={PD_CARD_FLUSH}>
            {loading ? (
              <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-3 p-4">
                <PdSkeleton />
                <PdSkeleton />
                <PdSkeleton />
              </div>
            ) : transactions.length === 0 ? (
              <PdEmpty
                icon={Wallet}
                title="No wallet activity yet"
                text="Top-ups, refunds and referral rewards will show up here."
              />
            ) : (
              transactions.map((t) => {
                const credit = t.type === "CREDIT";
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 border-t border-pd-line px-5 py-3 first:border-t-0"
                  >
                    <span
                      className={`grid size-9 shrink-0 place-items-center rounded-[10px] ${
                        credit ? "text-pd-green" : "text-pd-brand"
                      }`}
                    >
                      {credit ? <Plus size={16} /> : <FileText size={16} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <b className="block text-sm font-medium">{t.reason}</b>
                      <small className="text-xs text-pd-ink3">
                        {dTime(t.createdAt)} · Balance {inr2(t.balanceAfter)}
                      </small>
                    </div>
                    <span className={`text-sm font-semibold ${credit ? "text-pd-green" : ""}`}>
                      {credit ? "+" : "−"}
                      {inr2(Math.abs(t.amount))}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      <div className={PD_COL}>
        <section className={`${PD_CARD} flex flex-col gap-3`}>
          <p className="text-[13px] font-bold text-pd-ink3">Available balance</p>
          <div className="font-heading text-[40px] font-semibold leading-none">
            {loading ? "…" : inr2(balance)}
          </div>
          <button type="button" className={`${PD_BTN_PRI} w-full`} onClick={() => setAdding(true)} disabled={addingMoney}>
            <Plus size={16} />
            {addingMoney ? "Please wait…" : "Add money"}
          </button>
          <p className="text-[13px] text-pd-ink3">
            Credits from refunds and adjustments land here, not back on your original payment method.
          </p>
        </section>
      </div>

      {adding && <AddMoneyDialog balance={balance} onPay={pay} onClose={() => setAdding(false)} />}
      {toastNode}
    </div>
  );
}
