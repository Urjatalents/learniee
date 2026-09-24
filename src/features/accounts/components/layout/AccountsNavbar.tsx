"use client";

import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { GraduationCap } from "lucide-react";

import { logClientActivity } from "@/features/shared/utils/logClientActivity";

/**
 * The Accounts role previously had zero navigation chrome at all —
 * no logo, no logout, nothing — while Parent/Teacher each get a full
 * fixed navbar. Accounts only has this one page today, so this is
 * deliberately the slim version (no hamburger/sidebar, no search) —
 * same fixed-bar, brand-logo, logout pattern as
 * ParentNavbar/TeacherNavbar, just without the parts that only make
 * sense when there's more than one page to navigate between.
 *
 * Deliberately no NotificationBell here yet:
 * `notificationAuth.ts`'s `requireNotificationRecipient` only
 * resolves parent/teacher/admin today and would 403 for a genuine
 * Accounts-role login, even though `NotificationRecipientRole` has
 * an `ACCOUNTS` value reserved for it (06-OPEN-DECISIONS.md #32).
 * Wire this up once that auth path is extended, not before.
 */
export default function AccountsNavbar() {
  const router = useRouter();

  const handleLogout = async () => {
    await logClientActivity("LOGOUT");
    Cookies.remove("idToken");
    router.push("/login");
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-sm border-b border-violet-100 shadow-sm flex items-center px-4 sm:px-6 gap-4 z-50">
      <button
        type="button"
        onClick={() => router.push("/accounts")}
        className="flex items-center gap-2"
        aria-label="Go to Accounts dashboard"
      >
        <span className="w-9 h-9 rounded-2xl bg-gradient-to-br from-brand-light to-brand flex items-center justify-center text-white shadow-playful flex-shrink-0">
          <GraduationCap size={18} />
        </span>
        <span className="font-heading text-lg font-bold text-gray-800 tracking-tight">
          Learn<span className="text-brand">ie</span>
        </span>
        <span className="hidden sm:inline text-sm text-gray-400 font-medium ml-1">Accounts</span>
      </button>

      <div className="ml-auto flex items-center gap-4">
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
