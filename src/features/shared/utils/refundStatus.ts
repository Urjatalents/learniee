/** Labels + colours for a RefundRequest's status — shared by the Parent Payments page and the Admin screen. */

export const REFUND_STATUS_LABELS: Record<string, string> = {
  PENDING: "Refund requested — awaiting admin",
  APPROVED: "Refunded to wallet",
  REJECTED: "Refund not approved",
  CANCELLED: "Request withdrawn",
};

export function getRefundStatusStyle(status: string): string {
  switch (status) {
    case "PENDING":
      return "bg-amber-100 text-amber-700";
    case "APPROVED":
      return "bg-green-100 text-green-700";
    case "REJECTED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
}
