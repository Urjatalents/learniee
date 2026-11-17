"use client";

import { PD_BTN_DTXT_SM, PD_BTN_PRI_SM, PD_BTN_SEC_SM } from "@/features/parent/components/courses/pdUi";
import { Tag } from "@/features/parent/components/home/HomeBits";
import { statusTag } from "@/features/parent/components/reschedule/rescheduleLogic";
import type { RescheduleRequestRow } from "@/features/shared/types/rescheduleRequest";
import { isPendingOnViewer } from "@/features/shared/utils/rescheduleStatus";

export type RescheduleAction = "approve" | "reject" | "cancel";

/** True when the Parent can act on the request (respond to it or withdraw their own). */
export const hasActions = (r: RescheduleRequestRow) =>
  isPendingOnViewer(r, "PARENT") || r.status === "PENDING_TEACHER_APPROVAL";

interface Props {
  request: RescheduleRequestRow;
  acting: boolean;
  /** Show the final status as a tag when there is nothing to do (list rows). */
  compact?: boolean;
  onAct: (action: RescheduleAction, request: RescheduleRequestRow) => void;
}

/** Approve / Decline (teacher asked), Withdraw (you asked), or the final status tag. */
export default function RescheduleActions({ request: r, acting, compact, onAct }: Props) {
  if (isPendingOnViewer(r, "PARENT")) {
    return (
      <>
        <button type="button" disabled={acting} onClick={() => onAct("approve", r)} className={PD_BTN_PRI_SM}>
          Approve
        </button>
        <button type="button" disabled={acting} onClick={() => onAct("reject", r)} className={PD_BTN_SEC_SM}>
          Decline
        </button>
      </>
    );
  }

  if (r.status === "PENDING_TEACHER_APPROVAL") {
    return (
      <button type="button" disabled={acting} onClick={() => onAct("cancel", r)} className={PD_BTN_DTXT_SM}>
        Withdraw
      </button>
    );
  }

  if (!compact) return null;

  const [label, tone] = statusTag(r);
  return <Tag tone={tone}>{label}</Tag>;
}
