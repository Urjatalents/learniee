"use client";

import { useParentComplaints } from "@/features/parent/hooks/useComplaints";
import ComplaintsView from "@/features/shared/components/ComplaintsView";

/**
 * "Complain" sidebar entry. A Parent picks a department (Accounts / HR / IT),
 * writes a subject + description; it's OPEN until Admin responds
 * (`/admin/complaints`). UI lives in the shared `ComplaintsView`. See
 * `complaint.service.ts`.
 */
export default function ParentComplainPage() {
  const complaints = useParentComplaints();

  return <ComplaintsView eyebrow="Support" {...complaints} />;
}
