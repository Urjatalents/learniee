import type { TeacherApprovalState } from "@/features/admin/types/teacher";

const STYLES: Record<TeacherApprovalState, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

const LABELS: Record<TeacherApprovalState, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export default function TeacherStatusBadge({ status }: { status: TeacherApprovalState }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${STYLES[status] ?? STYLES.REJECTED}`}
    >
      {LABELS[status] ?? status}
    </span>
  );
}
