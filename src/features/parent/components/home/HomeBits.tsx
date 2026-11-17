import type { CSSProperties } from "react";
import { Star } from "lucide-react";

/** Small shared pieces for the Parent Home screen. */

export const kcStyle = (color: string | null | undefined): CSSProperties =>
  ({ "--kc": color ?? "var(--color-pd-brand)" }) as CSSProperties;

export function KidAvatar({
  name,
  color,
  size = "md",
}: {
  name: string;
  color: string | null;
  size?: "xs" | "md" | "lg";
}) {
  const dim = size === "xs" ? "size-5 text-[10px]" : size === "lg" ? "size-11 text-lg" : "size-8 text-sm";
  return (
    <span
      style={kcStyle(color)}
      className={`grid shrink-0 place-items-center rounded-full bg-(--kc) font-semibold text-white ${dim}`}
    >
      {(name || "?")[0]}
    </span>
  );
}

/** Teacher/neutral avatar (no learner colour). */
export function NeutralAvatar({ name, small = false }: { name: string; small?: boolean }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-[#ebe9f5] font-semibold text-[#4b4575] ${
        small ? "size-7 text-xs" : "size-8 text-sm"
      }`}
    >
      {(name || "?")[0]}
    </span>
  );
}

type TagTone = "amber" | "green" | "violet" | "red" | "gray";
const TAG_TONE: Record<TagTone, string> = {
  amber: "bg-pd-amber-bg text-pd-amber",
  green: "bg-pd-green-bg text-pd-green",
  violet: "bg-pd-b100 text-pd-brand-d",
  red: "bg-pd-red-bg text-pd-red",
  gray: "bg-pd-bg text-pd-ink2",
};

export function Tag({
  tone = "violet",
  children,
  className = "",
}: {
  tone?: TagTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${TAG_TONE[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function RatingBadge({ rating }: { rating: number | null }) {
  if (!rating) {
    return (
      <span className="relative inline-flex items-center rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold">
        <Tag tone="green">New</Tag>
      </span>
    );
  }
  return (
    <span className="relative inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-pd-ink2">
      <Star size={14} className="fill-[#f4c01e] text-[#f4c01e]" />
      {rating}
    </span>
  );
}

export function ProgressRing({ percent, size = 40 }: { percent: number; size?: number }) {
  const r = (size - 7) / 2;
  const c = 2 * Math.PI * r;
  const h = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="shrink-0 text-pd-ink">
      <circle cx={h} cy={h} r={r} fill="none" stroke="var(--color-pd-b100)" strokeWidth={5} />
      <circle
        cx={h}
        cy={h}
        r={r}
        fill="none"
        stroke="var(--color-pd-brand)"
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={`${(c * percent) / 100} ${c}`}
        transform={`rotate(-90 ${h} ${h})`}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize="11" fontWeight="600" fill="currentColor">
        {Math.round(percent)}%
      </text>
    </svg>
  );
}

/** Section wrapper: Baloo 19px heading, optional right-aligned action. */
export function Section({
  id,
  title,
  action,
  children,
}: {
  id: string;
  title: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id}>
      <h2
        id={id}
        className="mb-3 flex items-center justify-between gap-3 font-heading text-[19px] font-semibold text-pd-ink"
      >
        {title}
        {action}
      </h2>
      {children}
    </section>
  );
}

export const BTN_PRI =
  "inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-[10px] bg-pd-brand px-3 text-[13px] font-semibold text-white transition-colors hover:bg-pd-brand-d active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";
export const BTN_SEC =
  "inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-[10px] bg-pd-b50 px-3 text-[13px] font-semibold text-pd-brand-d transition-colors hover:bg-pd-b100 active:scale-[0.98]";
export const BTN_TXT =
  "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] font-semibold text-pd-brand transition-colors hover:bg-pd-b50";
