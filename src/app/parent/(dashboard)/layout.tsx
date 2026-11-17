"use client";

import { useRouter } from "next/navigation";

import ParentNavbar from "@/features/parent/components/layout/ParentNavbar";
import ParentSidebar from "@/features/parent/components/layout/ParentSidebar";
import ParentBottomNav from "@/features/parent/components/layout/ParentBottomNav";
import { endSession } from "@/features/shared/utils/endSession";
import { logClientActivity } from "@/features/shared/utils/logClientActivity";

export default function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const handleLogout = async () => {
    // Fire the log before ending the session — the endpoint needs
    // the idToken cookie to identify who's logging out.
    await logClientActivity("LOGOUT");
    await endSession();
    router.push("/login");
  };

  return (
    <div className="min-h-dvh bg-pd-bg text-pd-ink print:bg-white">
      {/* Chrome is hidden when printing/saving an invoice as PDF */}
      <div className="print:hidden">
        <ParentNavbar onLogout={handleLogout} />
        <ParentSidebar onLogout={handleLogout} />
        <ParentBottomNav onLogout={handleLogout} />
      </div>

      <main className="min-h-dvh pt-[60px] pb-16 lg:pl-60 lg:pb-0 print:p-0">
        {children}
      </main>
    </div>
  );
}
