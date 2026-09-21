"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

import TeacherNavbar from "@/features/teacher/components/layout/TeacherNavbar";
import TeacherSidebar from "@/features/teacher/components/layout/TeacherSidebar";
import { useTeacherAccessGuard } from "@/features/teacher/hooks/useTeacherAccessGuard";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Onboarding and the "waiting for approval" page happen before the teacher
  // has a dashboard, so they render without the Navbar/Sidebar (each has its
  // own layout/page chrome) and are exempt from the approval guard below.
  const isChromeFree =
    pathname?.startsWith("/teacher/onboarding") ||
    pathname?.startsWith("/teacher/pending-approval");

  // Every other /teacher/* page needs an approved application. Unfinished or
  // unapproved teachers are redirected (see useTeacherAccessGuard).
  const guard = useTeacherAccessGuard(!isChromeFree, pathname ?? null);

  if (isChromeFree) {
    return <>{children}</>;
  }

  if (guard.status !== "allowed") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-gray-50 px-4 text-center">
        {guard.status === "error" ? (
          <>
            <p className="text-sm text-red-600">
              We couldn&apos;t verify your account. Please try again.
            </p>
            <button
              onClick={guard.retry}
              className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-medium text-white hover:bg-violet-700"
            >
              Retry
            </button>
          </>
        ) : (
          <>
            <Loader2 className="size-6 animate-spin text-violet-600" />
            <p className="text-sm text-gray-500">Checking your account...</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-violet-50/40">
      {/* Fixed Navbar */}
      <TeacherNavbar
        onMenuClick={() =>
          setSidebarOpen((prev) => !prev)
        }
      />

      {/* Fixed Sidebar */}
      <TeacherSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Page Content */}
      <main className="min-h-screen pt-16 lg:pl-64 bg-gradient-to-b from-violet-50 via-white to-white">
        {children}
      </main>
    </div>
  );
}
