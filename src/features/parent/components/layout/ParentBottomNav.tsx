"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";

import {
  BOTTOM_NAV_IDS,
  MORE_NAV_IDS,
  PARENT_NAV,
  isNavActive,
} from "@/features/parent/components/layout/parentNav";

interface ParentBottomNavProps {
  onLogout: () => void;
  badges?: Partial<Record<string, number>>;
}

function BottomNavInner({ onLogout, badges }: ParentBottomNavProps) {
  const pathname = usePathname();
  const tab = useSearchParams().get("tab");
  const [moreOpen, setMoreOpen] = useState(false);

  // Close the sheet whenever the route changes.
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname, tab]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  const moreActive = !BOTTOM_NAV_IDS.some((id) =>
    isNavActive(PARENT_NAV[id], pathname, tab),
  );

  return (
    <>
      <nav
        aria-label="Main navigation"
        className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-pd-line bg-white px-1 pt-1.5 pb-[calc(6px+env(safe-area-inset-bottom))] lg:hidden"
      >
        {BOTTOM_NAV_IDS.map((id) => {
          const item = PARENT_NAV[id];
          const Icon = item.icon;
          const active = isNavActive(item, pathname, tab);

          return (
            <Link
              key={id}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] ${
                active ? "font-semibold text-pd-brand" : "font-medium text-pd-ink3"
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.4 : 2} />
              {(badges?.[id] ?? 0) > 0 && (
                <span className="absolute left-[calc(50%+6px)] top-[3px] size-[9px] rounded-full bg-amber-500 ring-2 ring-white" />
              )}
              <span>{id === "classes" ? "Classes" : item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={`flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] ${
            moreActive ? "font-semibold text-pd-brand" : "font-medium text-pd-ink3"
          }`}
        >
          <Menu size={22} strokeWidth={moreActive ? 2.4 : 2} />
          <span>More</span>
        </button>
      </nav>

      {moreOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end bg-pd-ink/50 lg:hidden"
          onClick={() => setMoreOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="More"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[calc(100dvh-32px)] w-full overflow-auto rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_16px_40px_-12px_rgba(23,23,43,0.28)]"
          >
            <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
              <h2 className="font-heading text-xl font-semibold text-pd-ink">More</h2>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Close"
                className="-mr-2 -mt-1 grid size-10 place-items-center rounded-[10px] text-pd-ink2 hover:bg-pd-b50 hover:text-pd-brand"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-0.5 px-5 pb-5">
              {MORE_NAV_IDS.map((id) => {
                const item = PARENT_NAV[id];
                const Icon = item.icon;
                const active = isNavActive(item, pathname, tab);

                return (
                  <Link
                    key={id}
                    href={item.href}
                    className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm ${
                      active
                        ? "bg-pd-b50 font-semibold text-pd-brand-d"
                        : "font-medium text-pd-ink2 hover:bg-pd-bg"
                    }`}
                  >
                    <Icon size={20} className={active ? "text-pd-brand" : ""} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              <div className="my-2 h-px bg-pd-line" />
              <button
                type="button"
                onClick={onLogout}
                className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-sm font-medium text-pd-ink2 hover:bg-pd-bg"
              >
                <LogOut size={20} />
                <span>Log out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function ParentBottomNav(props: ParentBottomNavProps) {
  return (
    <Suspense fallback={null}>
      <BottomNavInner {...props} />
    </Suspense>
  );
}
