"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export interface HubTab {
  /** Value used in `?tab=` — keep stable, old redirects and links use it. */
  key: string;
  label: string;
  /** Optional count shown next to the label (hidden when 0 / undefined). */
  badge?: number;
  /** Reachable by `?tab=` (nav links, redirects) but not shown as a pill. */
  hidden?: boolean;
  /** Only the active tab's content is mounted. */
  content: ReactNode;
}

interface Props {
  tabs: HubTab[];
  /** Tab shown when `?tab=` is missing or unknown. Defaults to the first. */
  defaultTab?: string;
}

/**
 * One page, several tabs, driven by the `?tab=` query parameter so every
 * tab is linkable and the back button works. Callers must render this
 * inside a <Suspense> boundary (it reads the URL with useSearchParams).
 */
export default function HubTabs({ tabs, defaultTab }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requested = searchParams.get("tab");

  const active =
    tabs.find((t) => t.key === requested) ??
    tabs.find((t) => t.key === defaultTab) ??
    tabs[0];

  return (
    <div>
      <div className="px-5 pt-5 sm:px-8 sm:pt-6">
        <div
          role="tablist"
          aria-label="Sections"
          className="flex gap-1 overflow-x-auto border-b border-violet-100"
        >
          {tabs.filter((t) => !t.hidden || t.key === active.key).map((tab) => {
            const isActive = tab.key === active.key;
            return (
              <Link
                key={tab.key}
                role="tab"
                aria-selected={isActive}
                href={`${pathname}?tab=${encodeURIComponent(tab.key)}`}
                scroll={false}
                className={`-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm transition-colors motion-reduce:transition-none ${
                  isActive
                    ? "border-brand font-bold text-brand"
                    : "border-transparent font-medium text-gray-500 hover:text-brand"
                }`}
              >
                {tab.label}
                {tab.badge ? (
                  <span className="rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                    {tab.badge > 99 ? "99+" : tab.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>

      <div role="tabpanel" key={active.key}>
        {active.content}
      </div>
    </div>
  );
}
