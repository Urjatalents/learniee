"use client";

import { useTeacherComplaints } from "@/features/teacher/hooks/useComplaints";
import ComplaintsView from "@/features/shared/components/ComplaintsView";

/**
 * "Complain" sidebar entry. A Teacher picks a department (Accounts / HR / IT),
 * writes a subject + description; it's OPEN until Admin responds
 * (`/admin/complaints`). UI lives in the shared `ComplaintsView`. See
 * `complaint.service.ts`.
 */
export default function TeacherComplainPage() {
  const complaints = useTeacherComplaints();

  return <ComplaintsView eyebrow="Support" {...complaints} />;
}
