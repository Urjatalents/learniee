"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import type { HubTab } from "@/features/shared/components/HubTabs";

interface Props {
  title: string;
  subtitle?: string;
  tabs: HubTab[];
  defaultTab?: string;
}

/**
 * Parent-design page: heading + pill tabs (driven by `?tab=`, so every tab is
 * linkable and Back works) + the active tab's content. Render inside <Suspense>.
 */
export default function PdHubTabs({ title, subtitle, tabs, defaultTab }: Props) {
  const pathname = usePathname();
  const requested = useSearchParams().get("tab");
  const active =
    tabs.find((t) => t.key === requested) ??
    tabs.find((t) => t.key === defaultTab) ??
    tabs[0];

  return (
    <div className="mx-auto max-w-[1160px] px-4 pb-12 pt-6 sm:px-6 sm:pt-8">
      <header>
        <h1 className="font-heading text-[26px] font-semibold leading-[1.15] text-pd-ink outline-none sm:text-[32px]">
          {title}
        </h1>
        {subtitle && <p className="text-sm text-pd-ink3">{subtitle}</p>}
      </header>

      <div
        role="tablist"
        aria-label={`${title} sections`}
        className="mt-4 flex w-max max-w-full gap-0.5 overflow-x-auto rounded-full bg-pd-b50 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab) => {
          const on = tab.key === active.key;
          return (
            <Link
              key={tab.key}
              role="tab"
              aria-selected={on}
              href={`${pathname}?tab=${encodeURIComponent(tab.key)}`}
              scroll={false}
              className={`flex h-[38px] shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[13px] transition-colors min-[481px]:px-4 ${
                on
                  ? "bg-white font-semibold text-pd-brand-d"
                  : "font-medium text-pd-ink2 hover:text-pd-brand-d"
              }`}
            >
              {tab.label}
              {tab.badge ? (
                <span className="min-w-[18px] rounded-full bg-pd-amber-bg px-1.5 text-center text-[11px] leading-[18px] text-pd-amber">
                  {tab.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>

      <div role="tabpanel" key={active.key}>
        {active.content}
      </div>
    </div>
  );
}
