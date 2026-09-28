import { redirect } from "next/navigation";

import { requireAdminOrAccounts } from "@/lib/verifyAdmin";
import ComplaintsBoard from "@/features/shared/components/ComplaintsBoard";

/** Accounts complaints only. The API scopes by the verified role too. */
export default async function AccountsComplaintsPage() {
  const auth = await requireAdminOrAccounts();
  if (!auth) {
    redirect("/login");
  }

  return (
    <ComplaintsBoard
      apiBase="/api/staff/complaints"
      lockedDepartment="ACCOUNTS"
      heading="Accounts Complaints"
    />
  );
}
