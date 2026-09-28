import { redirect } from "next/navigation";

import { requireIt } from "@/lib/verifyAdmin";
import ComplaintsBoard from "@/features/shared/components/ComplaintsBoard";

/** IT complaints only. The API scopes by the verified role too. */
export default async function ITComplaintsPage() {
  const auth = await requireIt();
  if (!auth) {
    redirect("/login");
  }

  return (
    <ComplaintsBoard
      apiBase="/api/staff/complaints"
      lockedDepartment="IT"
      heading="IT Complaints"
    />
  );
}
