/**
 * Single source of truth for turning an `Enrollment.status` enum
 * value into human copy. Used by every surface that shows enrollment
 * status (chat room list, parent "My Enrollments", teacher/admin
 * approval queues) so the wording never drifts between them.
 *
 * IMPORTANT: Parent-facing copy never mentions Admin, by direct
 * instruction — both PENDING_TEACHER_APPROVAL and
 * PENDING_ADMIN_APPROVAL read identically to a Parent as "waiting
 * for teacher approval". Teacher/Admin views get the real state.
 */

export type EnrollmentStatusValue =
  | "PENDING_APPROVAL"
  | "PENDING_TEACHER_APPROVAL"
  | "PENDING_PARENT_RECONFIRMATION"
  | "PENDING_ADMIN_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "ACTIVE"
  | "LAPSED"
  | "CANCELLED"
  | "COMPLETED"
  | string;

export type EnrollmentViewerRole = "parent" | "teacher" | "admin";

export function getEnrollmentStatusLabel(
  status: EnrollmentStatusValue,
  viewerRole: EnrollmentViewerRole,
): string {
  if (viewerRole === "parent") {
    switch (status) {
      case "PENDING_APPROVAL":
      case "PENDING_TEACHER_APPROVAL":
      case "PENDING_ADMIN_APPROVAL":
        return "Waiting for teacher approval";
      case "PENDING_PARENT_RECONFIRMATION":
        return "Review needed";
      case "APPROVED":
      case "ACTIVE":
        return "Enrolled";
      case "REJECTED":
        return "Not approved";
      case "CANCELLED":
        return "Cancelled";
      case "LAPSED":
        return "Lapsed";
      case "COMPLETED":
        return "Completed";
      default:
        return status;
    }
  }

  // Teacher / Admin — real, specific state.
  switch (status) {
    case "PENDING_APPROVAL":
      return "Pending approval";
    case "PENDING_TEACHER_APPROVAL":
      return "Awaiting your review";
    case "PENDING_PARENT_RECONFIRMATION":
      return "Awaiting parent confirmation";
    case "PENDING_ADMIN_APPROVAL":
      return viewerRole === "admin" ? "Pending your approval" : "Sent to admin";
    case "APPROVED":
      return "Approved";
    case "ACTIVE":
      return "Active";
    case "REJECTED":
      return "Rejected";
    case "CANCELLED":
      return "Cancelled";
    case "LAPSED":
      return "Lapsed";
    case "COMPLETED":
      return "Completed";
    default:
      return status;
  }
}

const STATUS_STYLES: Record<string, string> = {
  PENDING_APPROVAL: "bg-amber-100 text-amber-700",
  PENDING_TEACHER_APPROVAL: "bg-amber-100 text-amber-700",
  PENDING_ADMIN_APPROVAL: "bg-amber-100 text-amber-700",
  PENDING_PARENT_RECONFIRMATION: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  ACTIVE: "bg-green-100 text-green-700",
  LAPSED: "bg-gray-200 text-gray-600",
  REJECTED: "bg-red-100 text-red-700",
  CANCELLED: "bg-red-100 text-red-700",
  COMPLETED: "bg-violet-100 text-violet-700",
};

export function getEnrollmentStatusStyle(status: EnrollmentStatusValue): string {
  return STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600";
}

/** Statuses where the ChatRoom still accepts new messages. */
export const SENDABLE_ENROLLMENT_STATUSES = new Set([
  "PENDING_APPROVAL",
  "PENDING_TEACHER_APPROVAL",
  "PENDING_PARENT_RECONFIRMATION",
  "PENDING_ADMIN_APPROVAL",
  "APPROVED",
  "ACTIVE",
  "LAPSED",
]);

/**
 * Statuses where dual-approval has actually finished — i.e. lessons
 * can happen. Gates anything that should only unlock post-approval:
 * "mark session complete" (cycleProgress.service.ts) and the
 * Homework module (homework.service.ts) both use this same set, so
 * the definition of "approved" never drifts between the two.
 */
export const ACTIVE_ENROLLMENT_STATUSES = new Set(["ACTIVE", "LAPSED"]);
