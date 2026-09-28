import { redirect } from "next/navigation";

import { requireHr } from "@/lib/verifyAdmin";
import ComplaintsBoard from "@/features/shared/components/ComplaintsBoard";

/** HR complaints only. The API scopes by the verified role too. */
export default async function HRComplaintsPage() {
  const auth = await requireHr();
  if (!auth) {
    redirect("/login");
  }

  return (
    <ComplaintsBoard
      apiBase="/api/staff/complaints"
      lockedDepartment="HR"
      heading="HR Complaints"
    />
  );
}
