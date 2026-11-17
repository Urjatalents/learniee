"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LogOut } from "lucide-react";

import {
  PARENT_NAV,
  SIDEBAR_GROUPS,
  isNavActive,
} from "@/features/parent/components/layout/parentNav";

interface ParentSidebarProps {
  onLogout: () => void;
  /** Optional live counts by nav id (e.g. { classes: 1, reschedule: 2 }). */
  badges?: Partial<Record<string, number>>;
}

function SidebarInner({ onLogout, badges }: ParentSidebarProps) {
  const pathname = usePathname();
  const tab = useSearchParams().get("tab");

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 top-[60px] z-40 hidden w-60 flex-col gap-0.5 overflow-y-auto border-r border-pd-line bg-white px-3 py-4 lg:flex"
    >
      {SIDEBAR_GROUPS.map((group, gi) => (
        <div key={gi} className="flex flex-col gap-0.5">
          {gi > 0 && <div className="my-2 h-px bg-pd-line" />}
          {group.map((id) => {
            const item = PARENT_NAV[id];
            const Icon = item.icon;
            const active = isNavActive(item, pathname, tab);
            const count = badges?.[id] ?? 0;

            return (
              <Link
                key={id}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-sm transition-colors duration-150 ${
                  active
                    ? "bg-pd-b50 font-semibold text-pd-brand-d before:absolute before:-left-3 before:bottom-2.5 before:top-2.5 before:w-[3px] before:rounded-r-[3px] before:bg-pd-brand"
                    : "font-medium text-pd-ink2 hover:bg-pd-bg"
                }`}
              >
                <Icon size={20} strokeWidth={2} className={active ? "text-pd-brand" : ""} />
                <span>{item.label}</span>
                {count > 0 && (
                  <span className="ml-auto h-5 min-w-5 rounded-full bg-pd-amber-bg px-1.5 text-center text-[11px] font-semibold leading-5 text-pd-amber">
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}

      <button
        type="button"
        onClick={onLogout}
        className="mt-auto flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-sm font-medium text-pd-ink2 transition-colors duration-150 hover:bg-pd-bg"
      >
        <LogOut size={20} strokeWidth={2} />
        <span>Log out</span>
      </button>
    </nav>
  );
}

export default function ParentSidebar(props: ParentSidebarProps) {
  return (
    <Suspense fallback={null}>
      <SidebarInner {...props} />
    </Suspense>
  );
}
