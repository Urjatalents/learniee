"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import NotificationBell from "@/features/shared/components/NotificationBell";
import { ADMIN_NAV, isNavItemActive } from "@/features/admin/config/adminNav";
import { useAdminQueueCounts } from "@/features/admin/hooks/useAdminQueueCounts";
import {
  AdminCountsContext,
  useAdminCounts,
} from "@/features/admin/components/ui/AdminCountsContext";

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/admin"
      className="flex min-h-11 items-center gap-2.5 px-2"
      aria-label="Learniee Admin home"
    >
      <span
        className={`flex items-center justify-center bg-brand font-heading font-extrabold leading-none text-white ${
          compact ? "size-8 rounded-[10px] text-xl" : "size-9 rounded-[11px] text-[22px]"
        }`}
      >
        L
      </span>
      <span
        className={`font-heading font-extrabold leading-none text-brand-dark ${
          compact ? "text-[22px]" : "text-2xl"
        }`}
      >
        Learniee
      </span>
      {!compact && (
        <span className="ml-auto rounded-full bg-admin-tint px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider text-brand-dark">
          Admin
        </span>
      )}
    </Link>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { counts } = useAdminCounts();

  return (
    <nav aria-label="Admin" className="flex flex-col gap-[18px]">
      {ADMIN_NAV.map((group, index) => (
        <div key={group.label || `group-${index}`} className="flex flex-col gap-0.5">
          {group.label && (
            <div className="px-3 pb-1.5 text-xs font-extrabold uppercase tracking-[0.08em] text-admin-muted">
              {group.label}
            </div>
          )}

          {group.items.map((item) => {
            const active = isNavItemActive(item, pathname);
            const count = item.countKey && counts ? counts[item.countKey] : 0;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-bold transition-colors ${
                  active
                    ? "bg-admin-tint text-brand-dark"
                    : "text-admin-ink hover:bg-[#f6f1ff]"
                }`}
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1">{item.label}</span>
                {count > 0 && (
                  <span className="min-w-6 rounded-full bg-brand-yellow px-2 py-0.5 text-center text-[13px] font-extrabold text-admin-ink">
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

/**
 * Shared Admin chrome (Admin redesign, Oct 2026): fixed sidebar on wide
 * screens, slide-in drawer on phones, top bar with the notification
 * bell and Profile link. Mounted once by `src/app/admin/layout.tsx`, so
 * individual Admin pages only render their own content.
 */
export default function AdminShell({ children }: { children: React.ReactNode }) {
  const queue = useAdminQueueCounts();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Escape closes the drawer; lock page scroll while it is open.
  useEffect(() => {
    if (!drawerOpen) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setDrawerOpen(false);
    }

    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [drawerOpen]);

  return (
    <AdminCountsContext.Provider value={queue}>
      <div className="flex min-h-screen bg-admin-surface font-sans text-admin-ink">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-[272px] shrink-0 flex-col gap-5 overflow-y-auto border-r border-admin-line bg-white px-4 pb-8 pt-6 lg:flex">
          <Brand />
          <SidebarNav />
        </aside>

        {/* Mobile drawer */}
        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
            <button
              type="button"
              aria-label="Close menu"
              className="absolute inset-0 bg-admin-ink/40"
              onClick={() => setDrawerOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 flex w-[300px] max-w-[85vw] flex-col gap-5 overflow-y-auto bg-white px-4 pb-8 pt-4 shadow-xl">
              <div className="flex items-center justify-between">
                <Brand />
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close menu"
                  className="flex size-11 items-center justify-center rounded-xl border border-admin-line"
                >
                  <X className="size-5" />
                </button>
              </div>
              <SidebarNav onNavigate={() => setDrawerOpen(false)} />
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-2 border-b border-admin-line bg-white px-4 py-2.5 sm:px-8 sm:py-4">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              className="flex size-11 items-center justify-center rounded-xl border border-admin-line bg-white lg:hidden"
            >
              <Menu className="size-5" />
            </button>
            <div className="ml-1 lg:hidden">
              <Brand compact />
            </div>

            <div className="ml-auto flex items-center gap-2">
              <NotificationBell />
              <Link
                href="/admin/profile"
                className="flex min-h-11 items-center gap-2.5 rounded-full border border-admin-line bg-white pl-1.5 pr-3.5 text-[15px] font-bold hover:bg-admin-hover"
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-admin-tint font-extrabold text-brand-dark">
                  A
                </span>
                <span className="hidden sm:inline">Profile</span>
              </Link>
            </div>
          </header>

          <main className="w-full max-w-[1224px] px-4 py-6 sm:px-8 sm:py-8">{children}</main>
        </div>
      </div>
    </AdminCountsContext.Provider>
  );
}
