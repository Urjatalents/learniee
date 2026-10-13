import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/verifyAdmin";
import {
  getOngoingCycleRows,
  getTuitionLedgerRows,
  getDemoBookingRows,
  getAccountsSummary,
} from "@/features/accounts/server/export.service";
import AccountsDashboardShell from "@/features/accounts/components/AccountsDashboardShell";

export default async function AdminAccountsPage() {
  const admin = await requireAdmin();
  if (!admin) {
    redirect("/login");
  }

  const [ongoingCycleRows, ledgerRows, demoRows] = await Promise.all([
    getOngoingCycleRows(),
    getTuitionLedgerRows(),
    getDemoBookingRows(),
  ]);
  const summary = await getAccountsSummary(ledgerRows, demoRows);

  return (
    <AccountsDashboardShell
        heading="Accounts"
        subheading="Tuition and demo revenue, the same ledger the Accounts team sees. Export it as Excel."
        summary={summary}
        ongoingCycleRows={ongoingCycleRows}
        ledgerRows={ledgerRows}
        demoRows={demoRows}
        embedded
      />
  );
}
