"use client";

import PdDialog from "@/features/parent/components/courses/PdDialog";
import { PD_BTN_SEC } from "@/features/parent/components/courses/pdUi";
import { Tag } from "@/features/parent/components/home/HomeBits";
import RescheduleActions, {
  hasActions,
  type RescheduleAction,
} from "@/features/parent/components/reschedule/RescheduleActions";
import { slotLabel, statusTag } from "@/features/parent/components/reschedule/rescheduleLogic";
import { displayNameFor, type RescheduleRequestRow } from "@/features/shared/types/rescheduleRequest";

interface Props {
  request: RescheduleRequestRow;
  kidFirst: string;
  acting: boolean;
  onAct: (action: RescheduleAction, request: RescheduleRequestRow) => void;
  onClose: () => void;
}

function Note({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-lg bg-pd-b50 p-3 text-sm text-pd-ink">
      <small className="mb-0.5 block text-xs font-bold text-pd-ink3">{label}</small>
      {text}
    </div>
  );
}

/** "Reschedule request" dialog opened from a list row. */
export default function RescheduleDetailDialog({ request: r, kidFirst, acting, onAct, onClose }: Props) {
  const teacher = displayNameFor(r.teacher);
  const [label, tone] = statusTag(r);
  const title = r.enrollment.course.courseTitle || r.enrollment.subject || "Class";

  return (
    <PdDialog
      title="Reschedule request"
      onClose={onClose}
      inlineFooter
      footer={
        hasActions(r) ? (
          <RescheduleActions request={r} acting={acting} onAct={onAct} />
        ) : (
          <button type="button" onClick={onClose} className={`${PD_BTN_SEC} w-full`}>
            Close
          </button>
        )
      }
    >
      <div>
        <b className="text-base font-semibold">{title}</b>
        <div className="text-[13px] text-pd-ink3">
          {teacher} · {kidFirst}
        </div>
      </div>

      <div>
        <Tag tone={tone}>{label}</Tag>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="font-bold text-pd-ink3">Current time</dt>
        <dd className="text-right font-bold">{slotLabel(r.originalScheduledDate, r.originalScheduledTime)}</dd>
        <dt className="font-bold text-pd-ink3">New time</dt>
        <dd className="text-right font-bold">{slotLabel(r.proposedDate, r.proposedTime)}</dd>
        <dt className="font-bold text-pd-ink3">Proposed by</dt>
        <dd className="text-right font-bold">{r.requestedBy === "PARENT" ? "You" : teacher}</dd>
      </dl>

      {r.reason && <Note label="Reason" text={r.reason} />}
      {r.responseNote && <Note label="Response" text={r.responseNote} />}
    </PdDialog>
  );
}
