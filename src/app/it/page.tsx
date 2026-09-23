import { redirect } from "next/navigation";

import { requireIt } from "@/lib/verifyAdmin";
import StaffDashboardShell from "@/features/shared/components/layout/StaffDashboardShell";

export default async function ItDashboardPage() {
  const auth = await requireIt();
  if (!auth) {
    redirect("/login");
  }

  const welcomeName =
    [auth.given_name, auth.family_name].filter(Boolean).join(" ").trim() ||
    (typeof auth.email === "string" ? auth.email : "there");

  return (
    <StaffDashboardShell
      heading="IT Dashboard"
      subheading="Your account is set up. IT's own tools aren't built yet — this is a starting point."
      welcomeName={welcomeName}
      cards={[
        {
          title: "Account Access",
          description: "Reset a Teacher or Parent's password, or update their email/phone.",
          href: "/it/account-access",
        },
        {
          title: "System Health",
          description: "Infra/deploy status (Vercel, RDS, S3) — coming soon.",
        },
        {
          title: "Support Tickets",
          description: "Internal IT ticket queue — coming soon.",
        },
      ]}
    />
  );
}
