"use client";

import { KidAvatar } from "@/features/parent/components/home/HomeBits";
import { SubjectGlyph } from "@/features/parent/components/my-classes/pdClassesUi";
import RescheduleActions, {
  type RescheduleAction,
} from "@/features/parent/components/reschedule/RescheduleActions";
import { isDeclined, slotLabel } from "@/features/parent/components/reschedule/rescheduleLogic";
import { displayNameFor, type RescheduleRequestRow } from "@/features/shared/types/rescheduleRequest";

interface Props {
  request: RescheduleRequestRow;
  kidFirst: string;
  kidColor: string | null;
  acting: boolean;
  onOpen: (request: RescheduleRequestRow) => void;
  onAct: (action: RescheduleAction, request: RescheduleRequestRow) => void;
}

/** One row of the Reschedule list (design: `.rr`): class, old → new time, actions. */
export default function RescheduleRow({ request: r, kidFirst, kidColor, acting, onOpen, onAct }: Props) {
  const declined = isDeclined(r);
  const title = r.enrollment.course.courseTitle || r.enrollment.subject || "Class";

  return (
    <article
      className="relative grid grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_auto] items-center gap-x-[18px] border-t border-pd-line py-3.5 pl-[70px] pr-[18px] transition-colors first:border-t-0 hover:bg-[#faf9fe] max-[760px]:grid-cols-1 max-[760px]:gap-y-2 max-[760px]:pl-[66px] max-[760px]:pr-4"
    >
      <SubjectGlyph
        subject={r.enrollment.subject}
        className="absolute left-[18px] top-1/2 size-10 -translate-y-1/2 rounded-xl text-[15px] max-[760px]:left-3.5 max-[760px]:top-[26px] max-[760px]:translate-y-0"
      />

      <div className="flex min-w-0 flex-col">
        <button
          type="button"
          onClick={() => onOpen(r)}
          className="truncate text-left text-[15px] font-semibold leading-snug text-pd-ink after:absolute after:inset-0 after:content-['']"
        >
          {title}
        </button>
        <small className="flex min-w-0 items-center gap-1.5 text-[13px] text-pd-ink3">
          <span className="truncate">{displayNameFor(r.teacher)}</span> ·
          <KidAvatar name={kidFirst} color={kidColor} size="xs" />
          {kidFirst}
        </small>
      </div>

      <div className="flex min-w-0 flex-col text-[13px]">
        <span className={declined ? "text-pd-ink" : "text-pd-ink3 line-through decoration-1"}>
          {slotLabel(r.originalScheduledDate, r.originalScheduledTime)}
        </span>
        <span className={declined ? "font-normal text-pd-ink3 line-through" : "font-semibold text-pd-brand-d"}>
          {slotLabel(r.proposedDate, r.proposedTime)}
        </span>
      </div>

      <div className="relative z-[2] flex items-center justify-end gap-2 max-[760px]:justify-start">
        <RescheduleActions request={r} acting={acting} compact onAct={onAct} />
      </div>
    </article>
  );
}
