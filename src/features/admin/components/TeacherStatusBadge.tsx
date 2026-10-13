import type { TeacherApprovalState } from "@/features/admin/types/teacher";
import { AdminPill, type PillTone } from "@/features/admin/components/ui/primitives";

const TONES: Record<TeacherApprovalState, PillTone> = {
  PENDING: "warn",
  APPROVED: "brand",
  REJECTED: "dark",
};

const LABELS: Record<TeacherApprovalState, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export default function TeacherStatusBadge({ status }: { status: TeacherApprovalState }) {
  return <AdminPill tone={TONES[status] ?? "dark"}>{LABELS[status] ?? status}</AdminPill>;
}
