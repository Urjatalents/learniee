import { redirect } from "next/navigation";

import { requireHr } from "@/lib/verifyAdmin";
import StaffDashboardShell from "@/features/shared/components/layout/StaffDashboardShell";

export default async function HrDashboardPage() {
  const auth = await requireHr();
  if (!auth) {
    redirect("/login");
  }

  const welcomeName =
    [auth.given_name, auth.family_name].filter(Boolean).join(" ").trim() ||
    (typeof auth.email === "string" ? auth.email : "there");

  return (
    <StaffDashboardShell
      heading="HR Dashboard"
      subheading="Your account is set up. HR's own tools aren't built yet — this is a starting point."
      welcomeName={welcomeName}
      cards={[
        {
          title: "Staff Directory",
          description: "A directory of Parent/Teacher/Admin staff accounts — coming soon.",
        },
        {
          title: "Leave & Attendance",
          description: "Internal staff leave tracking — coming soon.",
        },
        {
          title: "Onboarding",
          description: "New-hire onboarding checklists — coming soon.",
        },
      ]}
    />
  );
}
