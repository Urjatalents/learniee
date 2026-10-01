/** Color + label for a ClassRequest's status — shared by the Parent, Teacher and Admin pages. */
export function getClassRequestStatusStyle(status: string): string {
  switch (status) {
    case "PENDING_REVIEW":
      return "bg-amber-100 text-amber-700";
    case "OPEN":
      return "bg-green-100 text-green-700";
    case "REJECTED":
      return "bg-red-100 text-red-700";
    case "CLOSED":
      return "bg-gray-200 text-gray-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

export const CLASS_REQUEST_STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: "Awaiting admin",
  OPEN: "Open to teachers",
  REJECTED: "Not taken forward",
  CLOSED: "Closed",
};

export function formatClassRequestDate(value: string | null | undefined) {
  if (!value) return "";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
