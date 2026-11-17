import type { ReactNode } from "react";

/** Design `.head` — page title + subtitle (same look as `PdHubTabs`' heading). */
export default function PdPageHead({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="font-heading text-[26px] font-semibold leading-[1.15] text-pd-ink outline-none sm:text-[32px]">
          {title}
        </h1>
        {subtitle && <p className="text-sm text-pd-ink3">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
