import type { ReactNode } from "react";

import type { InvoiceType } from "@/features/parent/hooks/useInvoices";

/** Shared pieces for the Parent Payments hub (Payments · Wallet · Referral tabs). */

/** Design `.card` / `.card.flush`. */
export const PD_CARD = "rounded-2xl border border-pd-line bg-white p-5";
export const PD_CARD_FLUSH = "overflow-hidden rounded-2xl border border-pd-line bg-white";

/** Design `.pgrid`: main column + 340px rail once there is room (>= 1180px). */
export const PD_PGRID =
  "mt-5 grid grid-cols-1 items-start gap-6 min-[1180px]:grid-cols-[minmax(0,1fr)_340px] *:min-w-0";
export const PD_COL = "flex min-w-0 flex-col gap-6";

/** Design `.sh` section heading. */
export const PD_SECTION_H = "mb-3 font-heading text-[19px] font-semibold text-pd-ink";

/** Amounts are always shown with paise in the design (₹8,400.00). */
const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
export const inr2 = (n: number) => money.format(n);

const inr0Fmt = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
export const inr0 = (n: number) => inr0Fmt.format(n);

const dLongFmt = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" });
export const dLong = (iso: string | Date) => dLongFmt.format(new Date(iso));

const dTimeFmt = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
export const dTime = (iso: string | Date) => dTimeFmt.format(new Date(iso)).replace(/\b(am|pm)\b/, (m) => m.toUpperCase());

export const INVOICE_TYPE_LABEL: Record<InvoiceType, string> = {
  ENROLLMENT_PAYMENT: "Enrollment",
  DEMO_BOOKING_PAYMENT: "Demo booking",
  WALLET_TOPUP: "Wallet top-up",
  DEMO_COUPON_PURCHASE: "Demo coupons",
  CYCLE_RENEWAL_PAYMENT: "Renewal",
};

/** Design `.kv`: label / value pairs. */
export function PdKv({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="font-bold text-pd-ink3">{k}</dt>
          <dd className="text-right font-semibold">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Design `.banner` (amber notice / red when it is an error). */
export function PdBanner({ tone = "amber", children }: { tone?: "amber" | "red"; children: ReactNode }) {
  return (
    <div
      role={tone === "red" ? "alert" : undefined}
      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold ${
        tone === "red" ? "bg-pd-red-bg text-pd-red" : "bg-pd-amber-bg text-pd-amber"
      }`}
    >
      {children}
    </div>
  );
}

/** Design `.sk` skeleton block. */
export function PdSkeleton({ height = 64 }: { height?: number }) {
  return <div className="animate-pulse rounded-lg bg-[#eeeaf7]" style={{ height }} />;
}
