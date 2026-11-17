import { fmtTime } from "@/features/parent/components/home/homeLogic";
import type { RescheduleRequestRow } from "@/features/shared/types/rescheduleRequest";
import { isPendingOnViewer } from "@/features/shared/utils/rescheduleStatus";

/** The three lists on the Reschedule page (design: Needs response / Waiting / History). */
export type RescheduleGroup = "you" | "teacher" | "hist";

export const GROUP_LABEL: Record<RescheduleGroup, string> = {
  you: "Needs response",
  teacher: "Waiting",
  hist: "History",
};

export const GROUP_EMPTY: Record<RescheduleGroup, [string, string]> = {
  you: ["Nothing needs your response", "You’re all caught up."],
  teacher: ["Nothing waiting", "Requests you send to a teacher show here until they reply."],
  hist: ["No history yet", "Approved and declined requests show here."],
};

export function groupOf(r: RescheduleRequestRow): RescheduleGroup {
  if (isPendingOnViewer(r, "PARENT")) return "you";
  if (r.status === "PENDING_TEACHER_APPROVAL" || r.status === "PENDING_PARENT_APPROVAL") {
    return "teacher";
  }
  return "hist";
}

export function splitByGroup(list: RescheduleRequestRow[]) {
  const out: Record<RescheduleGroup, RescheduleRequestRow[]> = { you: [], teacher: [], hist: [] };
  list.forEach((r) => out[groupOf(r)].push(r));
  return out;
}

/** A request that will not happen (declined or withdrawn): the new time is struck through. */
export const isDeclined = (r: Pick<RescheduleRequestRow, "status">) =>
  r.status === "REJECTED" || r.status === "CANCELLED";

export type StatusTone = "amber" | "green" | "violet" | "red" | "gray";

/** Status tag shown in the list (history only) and in the detail dialog. */
export function statusTag(r: RescheduleRequestRow): [string, StatusTone] {
  switch (r.status) {
    case "PENDING_PARENT_APPROVAL":
      return ["Needs your response", "amber"];
    case "PENDING_TEACHER_APPROVAL":
      return ["Waiting on teacher", "violet"];
    case "APPROVED":
      return ["Approved", "green"];
    case "REJECTED":
      return ["Declined", "red"];
    default:
      return ["Withdrawn", "gray"];
  }
}

/**
 * Class dates are saved as UTC midnight of the platform (IST) calendar date, so the
 * calendar day is read from the UTC parts and the wall-clock time from `time` ("HH:mm").
 */
export function slotToDate(dateIso: string, time: string | null): { date: Date; hasTime: boolean } {
  const d = new Date(dateIso);
  const [h, m] = (time ?? "").split(":").map(Number);
  const hasTime = Number.isFinite(h) && Number.isFinite(m);

  return {
    date: new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hasTime ? h : 0, hasTime ? m : 0),
    hasTime,
  };
}

/** "Tue, 18 Nov · 5:00 PM" (date only when the request has no time). */
export function slotLabel(dateIso: string, time: string | null): string {
  const { date, hasTime } = slotToDate(dateIso, time);
  const day = date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

  return hasTime ? `${day} · ${fmtTime(date)}` : day;
}

export const toIsoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
