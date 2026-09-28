"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Menu, Search } from "lucide-react";

import DemoCouponButton from "@/features/parent/components/layout/DemoCouponButton";
import WalletBadge from "@/features/parent/components/layout/WalletBadge";
import NotificationBell from "@/features/shared/components/NotificationBell";
import BrandLogo from "@/features/shared/components/BrandLogo";
import { logClientActivity } from "@/features/shared/utils/logClientActivity";

interface Parent {
  firstName: string;
  lastName: string;
  visibleName: string | null;
  email: string;
}

interface ParentNavbarProps {
  onMenuClick: () => void;
}

export default function ParentNavbar({ onMenuClick }: ParentNavbarProps) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [parent, setParent] = useState<Parent | null>(null);

  useEffect(() => {
    async function fetchParent() {
      try {
        const res = await fetch("/api/parent/profile");

        if (!res.ok) {
          return;
        }

        const data = await res.json();

        setParent(data.parent);
      } catch (error) {
        console.error("Failed to load parent:", error);
      }
    }

    fetchParent();
  }, []);

  const handleLogout = async () => {
    // Fire the log before removing the cookie — the endpoint needs
    // the idToken cookie to identify who's logging out.
    await logClientActivity("LOGOUT");

    Cookies.remove("idToken");

    router.push("/login");
  };

  const parentName =
    parent?.visibleName ||
    `${parent?.firstName ?? ""} ${parent?.lastName ?? ""}`.trim();

  const parentInitial = (parentName || "P").trim().charAt(0).toUpperCase();

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-sm border-b border-violet-100 shadow-sm flex items-center px-3 sm:px-5 gap-4 z-50">
      {/* LEFT */}
      <div className="flex items-center gap-3">
        {/* Hamburger */}
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open menu"
          className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center hover:bg-brand-dark shadow-playful transition lg:hidden"
        >
          <Menu size={18} />
        </button>

        {/* Logo — clickable back to the dashboard, same as HOME */}
        <button
          type="button"
          onClick={() => router.push("/parent")}
          className="flex items-center gap-2"
          aria-label="Go to dashboard"
        >
          <BrandLogo className="h-9 w-auto" priority />
        </button>
      </div>

      {/* RIGHT */}
      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        {/* Home */}
        <button
          type="button"
          onClick={() => router.push("/parent")}
          className="hidden sm:block text-sm font-bold tracking-wide text-brand hover:text-brand-dark transition"
        >
          HOME
        </button>

        {/* Search — visual only, not wired to a backend search yet */}
        <div className="relative hidden md:block">
          <input
            type="text"
            placeholder="Find a course..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48 h-9 rounded-full border-2 border-violet-100 bg-violet-50/50 px-4 pr-9 text-sm outline-none focus:border-brand-light focus:bg-white transition"
          />

          <Search
            size={15}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand"
          />
        </div>

        {/* Demo coupons — balance, buy more, upcoming demos.
            Moved here from the dashboard (Aug 30, 2026); see
            DemoCouponButton.tsx. */}
        <DemoCouponButton />

        {/* Wallet — balance + add-money, mirrors DemoCouponButton's
            dropdown pattern. Added Sep 7, 2026, see WalletBadge.tsx. */}
        <WalletBadge />

        {/* Notification — replaced the static placeholder (was
            waiting on Notification Center, 06-OPEN-DECISIONS.md #32)
            with a working dropdown, see NotificationBell.tsx. */}
        <NotificationBell />

        <div className="hidden sm:block w-px h-8 bg-violet-100" />

        {/* Parent Name + avatar */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="max-w-28 truncate text-sm font-semibold text-gray-700">
            {parentName || "Parent"}
          </span>
          <span className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-300 to-brand-yellow flex items-center justify-center text-sm font-bold text-violet-900 shadow-sm flex-shrink-0">
            {parentInitial}
          </span>
        </div>

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          className="text-sm font-semibold text-gray-500 hover:text-brand transition"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
