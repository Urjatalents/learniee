"use client";

import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { GraduationCap } from "lucide-react";

import { logClientActivity } from "@/features/shared/utils/logClientActivity";

interface StaffNavbarProps {
  /** Short role label shown next to the logo, e.g. "HR" or "IT". */
  label: string;
  /** Where the logo click and this staff role's dashboard live, e.g. "/hr". */
  homePath: string;
  /** Where this role's Community page lives, e.g. "/hr/community". */
  communityPath?: string;
}

/**
 * Slim fixed navbar (logo + logout, no sidebar/search) shared by the
 * simple internal-staff dashboards (HR, IT) added Sep 23, 2026 —
 * same fixed-bar/brand-logo/logout pattern as AccountsNavbar, just
 * parametrized by role so HR and IT don't each need their own copy.
 * Extend AccountsNavbar to use this too if Accounts ever needs the
 * same shape.
 */
export default function StaffNavbar({ label, homePath, communityPath }: StaffNavbarProps) {
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
        onClick={() => router.push(homePath)}
        className="flex items-center gap-2"
        aria-label={`Go to ${label} dashboard`}
      >
        <span className="w-9 h-9 rounded-2xl bg-gradient-to-br from-brand-light to-brand flex items-center justify-center text-white shadow-playful flex-shrink-0">
          <GraduationCap size={18} />
        </span>
        <span className="font-heading text-lg font-bold text-gray-800 tracking-tight">
          Learn<span className="text-brand">ie</span>
        </span>
        <span className="hidden sm:inline text-sm text-gray-400 font-medium ml-1">{label}</span>
      </button>

      <div className="ml-auto flex items-center gap-4">
        {communityPath && (
          <button
            type="button"
            onClick={() => router.push(communityPath)}
            className="text-sm font-semibold text-gray-500 hover:text-brand transition"
          >
            Community
          </button>
        )}
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
