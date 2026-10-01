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

/** Course "Frequency" option matching a number of classes per week (null if none fits). */
export function frequencyForDays(count: number): string | null {
  switch (count) {
    case 1:
      return "Weekly";
    case 3:
      return "3 Days a Week";
    case 5:
      return "5 Days a Week";
    case 7:
      return "Daily";
    default:
      return null;
  }
}

/** Course "Time Slot" option for an "HH:mm" time (null if unreadable). */
export function timeSlotForTime(time: string | null | undefined): string | null {
  const hour = Number((time ?? "").split(":")[0]);

  if (!time || !Number.isFinite(hour)) return null;

  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";

  return "Evening";
}
