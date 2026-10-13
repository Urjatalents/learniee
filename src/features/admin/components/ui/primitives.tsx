import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Small presentational pieces shared by every redesigned Admin screen.
 * Server-safe (no hooks), so pages and tables can use them freely.
 */

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/* ------------------------------ Page header ------------------------------ */

interface Crumb {
  label: string;
  href?: string;
}

export function AdminPageHeader({
  crumbs,
  title,
  description,
  actions,
}: {
  crumbs?: Crumb[];
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        {crumbs && crumbs.length > 0 && (
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-admin-muted"
          >
            {crumbs.map((crumb, index) => (
              <span key={`${crumb.label}-${index}`} className="inline-flex items-center gap-1.5">
                {index > 0 && <ChevronRight className="size-3.5" aria-hidden="true" />}
                {crumb.href ? (
                  <Link href={crumb.href} className="text-brand-dark hover:underline">
                    {crumb.label}
                  </Link>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="font-heading text-3xl font-bold leading-tight text-admin-ink sm:text-4xl">
          {title}
        </h1>
        {description && <p className="text-[17px] text-admin-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Standard page column: consistent vertical rhythm for every screen. */
export function AdminPage({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-6">{children}</div>;
}

export function AdminSectionTitle({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="font-heading text-[22px] font-bold text-admin-ink">
      {children}
    </h2>
  );
}

/* --------------------------------- Surfaces -------------------------------- */

export function AdminPanel({
  children,
  className,
  padded = false,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={cx(
        "rounded-[18px] border border-admin-line bg-white",
        padded && "p-5 sm:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AdminStatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: ReactNode;
  note?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[18px] border border-admin-line bg-white p-5">
      <span className="text-sm font-bold text-admin-muted">{label}</span>
      <span className="font-heading text-3xl font-extrabold leading-none text-admin-ink">
        {value}
      </span>
      {note && <span className="text-sm text-admin-muted">{note}</span>}
    </div>
  );
}

export function AdminEmpty({ message }: { message: string }) {
  return (
    <AdminPanel className="px-6 py-12 text-center">
      <p className="text-base text-admin-muted">{message}</p>
    </AdminPanel>
  );
}

export function AdminLoading({ message = "Loading…" }: { message?: string }) {
  return (
    <AdminPanel className="px-6 py-12 text-center" >
      <p role="status" className="text-base text-admin-muted">
        {message}
      </p>
    </AdminPanel>
  );
}

export function AdminError({ children }: { children: ReactNode }) {
  if (!children) return null;

  return (
    <div
      role="alert"
      className="rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-[15px] font-semibold text-red-800"
    >
      {children}
    </div>
  );
}

/* --------------------------------- Controls -------------------------------- */

export function AdminTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: Array<{ value: T; label: string; count?: number }>;
  value: T;
  onChange: (next: T) => void;
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="inline-flex max-w-full gap-1 overflow-x-auto rounded-[14px] border border-admin-line bg-white p-1"
    >
      {tabs.map((tab) => {
        const selected = tab.value === value;

        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.value)}
            className={cx(
              "inline-flex min-h-11 shrink-0 items-center rounded-[10px] px-[18px] text-[15px] transition-colors",
              selected
                ? "bg-brand font-extrabold text-white"
                : "font-bold text-admin-ink hover:bg-admin-hover",
            )}
          >
            {tab.label}
            {typeof tab.count === "number" && (
              <span
                className={cx(
                  "ml-1.5 rounded-full px-2 py-0.5 text-[13px]",
                  selected ? "bg-brand-yellow text-admin-ink" : "bg-admin-tint text-brand-dark",
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function AdminSearch({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  label?: string;
}) {
  return (
    <div className="relative flex w-full max-w-[360px] flex-1 basis-64 items-center">
      <Search className="absolute left-3.5 size-[18px] text-admin-muted" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label ?? placeholder}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-admin-line bg-white pl-[42px] pr-3.5 text-[15px] text-admin-ink outline-none placeholder:text-admin-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
    </div>
  );
}

/** Shared control styling for form fields inside Admin panels. */
export const adminInputClass =
  "h-11 w-full rounded-xl border border-admin-line bg-white px-3.5 text-[15px] text-admin-ink outline-none placeholder:text-admin-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-60";

export const adminTextareaClass =
  "w-full rounded-xl border border-admin-line bg-white px-3.5 py-2.5 text-[15px] text-admin-ink outline-none placeholder:text-admin-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-60";

export const adminLabelClass = "mb-1.5 block text-sm font-extrabold text-admin-ink";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const BUTTON_BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-[18px] text-[15px] font-extrabold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:bg-[#6a1fd6]",
  secondary: "border border-admin-line bg-white text-admin-ink hover:bg-admin-hover",
  danger: "bg-red-600 text-white hover:bg-red-700",
  ghost: "text-brand-dark hover:bg-admin-tint",
};

/** Class string for `<Link>` / `<a>` buttons and plain `<button>`s alike. */
export function adminButtonClass(variant: ButtonVariant = "primary", className?: string) {
  return cx(BUTTON_BASE, BUTTON_VARIANTS[variant], className);
}

/* ---------------------------------- Pills ---------------------------------- */

export type PillTone = "brand" | "warn" | "good" | "bad" | "neutral" | "dark";

const PILL_TONES: Record<PillTone, string> = {
  brand: "bg-admin-tint text-brand-dark",
  warn: "bg-[#fde9a2] text-admin-ink",
  good: "bg-green-100 text-green-800",
  bad: "bg-red-100 text-red-800",
  neutral: "bg-admin-surface text-admin-muted border border-admin-line",
  dark: "bg-admin-ink text-white",
};

export function AdminPill({
  tone = "brand",
  children,
  className,
}: {
  tone?: PillTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[3px] text-sm font-extrabold",
        PILL_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function AdminAvatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-full bg-admin-tint text-sm font-extrabold text-brand-dark"
    >
      {initials || "?"}
    </span>
  );
}

/* ---------------------------------- Tables --------------------------------- */

/** Scroll wrapper + panel chrome for a data table. */
export function AdminTableCard({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-[18px] border border-admin-line bg-white">
      {children}
    </div>
  );
}

export const adminTableClass = "w-full min-w-[720px] text-left text-[15px]";
export const adminThClass =
  "bg-admin-surface px-5 py-3.5 text-[13px] font-extrabold uppercase tracking-[0.06em] text-admin-muted first:pl-6 last:pr-6";
export const adminTdClass = "px-5 py-3.5 align-middle first:pl-6 last:pr-6";
export const adminRowClass = "border-t border-admin-line-soft hover:bg-admin-hover";

export function formatAdminDate(value: string | Date | null | undefined) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ---------------------------------- Dialog --------------------------------- */

/** Centered confirmation dialog. Click on the backdrop calls `onClose`. */
export function AdminDialog({
  title,
  subtitle,
  onClose,
  children,
  footer,
  wide = false,
}: {
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-admin-ink/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={cx(
          "max-h-[90vh] w-full overflow-y-auto rounded-[18px] bg-white p-6 shadow-xl",
          wide ? "max-w-lg" : "max-w-md",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="font-heading text-xl font-bold">{title}</h2>
        {subtitle && <p className="mt-1 truncate text-[15px] text-admin-muted">{subtitle}</p>}
        <div className="mt-4">{children}</div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">{footer}</div>
      </div>
    </div>
  );
}

/** Label / value pair used on request cards (e.g. "Amount paid — ₹4,000"). */
export function AdminFact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-admin-muted">
        {label}
      </span>
      <span className="text-base font-bold break-words">{children}</span>
    </div>
  );
}
