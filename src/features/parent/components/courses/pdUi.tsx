import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import type { ParentCourse } from "@/features/parent/types/course";

/** Shared class strings + tiny pieces for the Parent design (Find a course). */

const BTN =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-semibold transition-colors active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";
export const PD_BTN_PRI = `${BTN} h-[42px] bg-pd-brand px-4 text-sm text-white hover:bg-pd-brand-d`;
export const PD_BTN_SEC = `${BTN} h-[42px] bg-pd-b50 px-4 text-sm text-pd-brand-d hover:bg-pd-b100`;
export const PD_BTN_DNG = `${BTN} h-[42px] bg-pd-red px-4 text-sm text-white hover:bg-[#b91c1c]`;
export const PD_BTN_PRI_SM = `${BTN} h-[34px] bg-pd-brand px-3 text-[13px] text-white hover:bg-pd-brand-d`;
export const PD_BTN_SEC_SM = `${BTN} h-[34px] bg-pd-b50 px-3 text-[13px] text-pd-brand-d hover:bg-pd-b100`;
export const PD_BTN_DTXT_SM = `${BTN} h-[34px] px-3 text-[13px] text-pd-red hover:bg-pd-red-bg`;

export const PD_INPUT =
  "h-[46px] w-full rounded-xl border border-pd-line2 bg-white px-4 text-sm text-pd-ink outline-none transition focus:border-pd-brand focus:ring-4 focus:ring-pd-b100 aria-invalid:border-pd-red disabled:bg-pd-bg";
export const PD_LABEL = "text-[13px] font-semibold text-pd-ink2";
export const PD_ERR = "text-xs font-bold text-pd-red";

export const PD_SEARCH_INPUT =
  "h-11 w-full rounded-full border border-pd-line bg-white pl-[42px] pr-4 text-sm text-pd-ink outline-none transition focus:border-pd-brand focus:ring-4 focus:ring-pd-b100";

export const pillFilter = (active: boolean) =>
  `h-9 rounded-full border px-4 text-[13px] font-semibold transition-colors ${
    active
      ? "border-pd-brand bg-pd-brand text-white"
      : "border-pd-line bg-white text-pd-ink2 hover:border-pd-brand"
  }`;

export function PdEmpty({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
      <span className="grid size-14 place-items-center rounded-xl bg-pd-b50 text-pd-brand">
        <Icon size={26} />
      </span>
      <h3 className="font-heading text-lg font-semibold text-pd-ink">{title}</h3>
      <p className="max-w-[360px] text-sm text-pd-ink3">{text}</p>
      {action}
    </div>
  );
}

export function GridSkeleton({ count = 6, height = 190 }: { count?: number; height?: number }) {
  return (
    <div
      aria-busy="true"
      aria-label="Loading"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 min-[1180px]:grid-cols-3"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="animate-pulse rounded-2xl bg-[#eeeaf7]" style={{ height }} />
      ))}
    </div>
  );
}

export const teacherDisplayName = (t: ParentCourse["teacher"]) =>
  t.visibleName || `${t.firstName} ${t.lastName}`.trim() || "Teacher";

export const coursePrice = (price: string | null) => {
  const n = Number(price);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export const rupees = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
