"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { HelpCircle, LogOut, Search, User } from "lucide-react";

import DemoCouponButton from "@/features/parent/components/layout/DemoCouponButton";
import WalletBadge from "@/features/parent/components/layout/WalletBadge";
import NotificationBell from "@/features/shared/components/NotificationBell";
import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";
import BrandLogo from "@/features/shared/components/BrandLogo";
import { getInitial } from "@/lib/initials";

interface Parent {
  firstName: string;
  lastName: string;
  visibleName: string | null;
  email: string;
}

interface ParentNavbarProps {
  onLogout: () => void;
}

export default function ParentNavbar({ onLogout }: ParentNavbarProps) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [parent, setParent] = useState<Parent | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const fetchParent = useCallback(async () => {
    try {
      const res = await fetch("/api/parent/profile");
      if (!res.ok) return;
      const data = await res.json();
      setParent(data.parent);
    } catch (error) {
      console.error("Failed to load parent:", error);
    }
  }, []);

  useEffect(() => {
    fetchParent();
  }, [fetchParent]);

  // Name changes made on the profile page show up here straight away.
  useAutoRefresh(() => fetchParent(), { paths: ["/api/parent/profile"] });

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const parentName =
    parent?.visibleName ||
    `${parent?.firstName ?? ""} ${parent?.lastName ?? ""}`.trim();
  const parentInitial = getInitial(parentName, "P");

  const goTo = (path: string) => {
    setMenuOpen(false);
    router.push(path);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-[60px] items-center gap-3 border-b border-pd-line bg-white px-4 sm:px-6">
      <button
        type="button"
        onClick={() => router.push("/parent")}
        className="flex shrink-0 items-center lg:w-50"
        aria-label="Learniee home"
      >
        <BrandLogo className="h-8 w-auto" priority />
      </button>

      {/* Search — Enter jumps to the course catalogue with the query */}
      <div className="relative hidden max-w-[400px] flex-1 md:block">
        <Search
          size={18}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-pd-ink3"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const q = search.trim();
              router.push(q ? `/parent/courses?q=${encodeURIComponent(q)}` : "/parent/courses");
            }
          }}
          placeholder="Find a course…"
          aria-label="Find a course"
          className="h-10 w-full rounded-[10px] border border-pd-line bg-pd-bg pl-[42px] pr-4 text-sm outline-none transition focus:border-pd-brand focus:bg-white focus:ring-4 focus:ring-pd-b100"
        />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <DemoCouponButton />
        <WalletBadge />
        <NotificationBell buttonClassName="relative grid size-11 place-items-center rounded-[10px] text-pd-ink2 transition-colors hover:bg-pd-b50 hover:text-pd-brand" />

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="true"
            aria-expanded={menuOpen}
            aria-label="Account menu"
            className="flex items-center gap-2 rounded-full p-1 hover:bg-pd-b50"
          >
            <span className="grid size-9 place-items-center rounded-full bg-pd-b100 font-bold text-pd-brand-d">
              {parentInitial}
            </span>
            <span className="hidden max-w-32 truncate pr-2 text-sm font-bold text-pd-ink sm:block">
              {parentName || "Parent"}
            </span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-xl border border-pd-line bg-white py-1 shadow-[0_16px_40px_-12px_rgba(23,23,43,0.28)]">
              <button
                type="button"
                onClick={() => goTo("/parent/account")}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-pd-ink hover:bg-pd-b50"
              >
                <User size={18} /> Account
              </button>
              <button
                type="button"
                onClick={() => goTo("/parent/complain")}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-pd-ink hover:bg-pd-b50"
              >
                <HelpCircle size={18} /> Help
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onLogout();
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-pd-ink hover:bg-pd-b50"
              >
                <LogOut size={18} /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
