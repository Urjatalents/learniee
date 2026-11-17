"use client";

import { Loader2 } from "lucide-react";

import { PD_BTN_SEC } from "@/features/parent/components/courses/pdUi";
import { inr } from "@/features/parent/components/home/homeLogic";

interface Props {
  loading: boolean;
  remainingFree: number;
  paidDemoPrice: number;
  /** Wallet balance in rupees; null while loading / unavailable. */
  walletBalance: number | null;
  /** Total paid for demos in the current view, in rupees. */
  paidTotal: number;
  buying: boolean;
  onBuy: () => void;
}

/** Right-hand "Demo coupons" card: free demos left, wallet, paid total, buy button. */
export default function DemoCouponsCard({
  loading,
  remainingFree,
  paidDemoPrice,
  walletBalance,
  paidTotal,
  buying,
  onBuy,
}: Props) {
  return (
    <section aria-label="Demo coupons" className="rounded-2xl border border-pd-line bg-white p-5">
      <div className="text-[13px] font-medium text-pd-ink2">Demo coupons</div>

      <div className="mt-1 font-heading text-[32px] font-semibold">
        {loading ? "…" : remainingFree}{" "}
        <span className="text-base">free demo{remainingFree === 1 ? "" : "s"} left</span>
      </div>

      <p className="mt-1.5 text-sm text-pd-ink3">
        Every account starts with 2 free demos. After that, each demo costs {inr(paidDemoPrice)}.
      </p>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-pd-bg px-4 py-3">
          <small className="block text-xs font-medium text-pd-ink3">Wallet balance</small>
          <b className="text-sm font-medium">{walletBalance === null ? "—" : inr(walletBalance)}</b>
        </div>
        <div className="rounded-lg bg-pd-bg px-4 py-3">
          <small className="block text-xs font-medium text-pd-ink3">Paid demos</small>
          <b className="text-sm font-medium">{inr(paidTotal)}</b>
        </div>
      </div>

      <button
        type="button"
        onClick={onBuy}
        disabled={buying || loading}
        className={`${PD_BTN_SEC} mt-3 w-full`}
      >
        {buying && <Loader2 size={16} className="animate-spin" />}
        Buy extra coupon · {inr(paidDemoPrice)}
      </button>
    </section>
  );
}
