import { formatPlatformTime } from "@/lib/platformTime";
import {
  SESSION_STATUS_LABEL,
  SESSION_STATUS_STYLE,
} from "@/features/shared/utils/sessionOutcome";
import type { SessionReviewItem } from "@/features/shared/types/sessionReview";
import {
  AdminFact,
  AdminPanel,
  adminButtonClass,
} from "@/features/admin/components/ui/primitives";

function at(iso: string | null) {
  return iso ? formatPlatformTime(new Date(iso), true) : "—";
}

const REASON_LABEL = {
  NEEDS_REVIEW: "Needs review",
  REPORTED: "Parent reported",
  DECIDED: "Decided",
} as const;

function Callout({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-[14px] bg-admin-surface px-4 py-3">
      <span className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-admin-muted">
        {label}
      </span>
      <span className="whitespace-pre-wrap text-[15px]">{children}</span>
    </div>
  );
}

export default function SessionReviewCard({
  item,
  onDecide,
}: {
  item: SessionReviewItem;
  onDecide: () => void;
}) {
  return (
    <AdminPanel padded>
      <article className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-brand-dark">
              {REASON_LABEL[item.reason]}
              {item.sessionNumber !== null && ` · Session ${item.sessionNumber}`}
              {item.cycle && ` · Cycle ${item.cycle.cycleNumber} (${item.cycle.status.toLowerCase()})`}
            </span>
            <span className="text-lg font-extrabold">
              {item.courseTitle ?? "Class"} — {item.studentName}
            </span>
            <span className="text-[15px] text-admin-muted">
              Teacher {item.teacherName} · Parent {item.parentName}
            </span>
            <span className="text-[15px] text-admin-muted">
              {at(item.startsAt)} – {at(item.endsAt)}
            </span>
          </div>

          <div className="flex flex-col items-end gap-3">
            <span
              className={`whitespace-nowrap rounded-full px-3 py-1 text-sm font-extrabold ${SESSION_STATUS_STYLE[item.status]}`}
            >
              {SESSION_STATUS_LABEL[item.status]}
            </span>
            <button
              type="button"
              onClick={onDecide}
              aria-label={`${item.kind === "OVERRIDE" ? "Override" : "Decide"} ${item.courseTitle ?? "class"} for ${item.studentName}`}
              className={adminButtonClass("primary")}
            >
              {item.kind === "OVERRIDE" ? "Override" : "Decide"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-y border-admin-line-soft py-4 md:grid-cols-4">
          <AdminFact label="Teacher started">{at(item.teacherStartedAt)}</AdminFact>
          <AdminFact label="Student joined">{at(item.studentJoinedAt)}</AdminFact>
          <AdminFact label="Teacher ended">{at(item.teacherEndedAt)}</AdminFact>
          <AdminFact label="Time together">
            {item.overlapPercent !== null ? `${item.overlapPercent}% of the class` : "—"}
          </AdminFact>
        </div>

        {(item.status === "CANCELLED" || item.status === "CANCELLED_LATE") && (
          <p className="text-[15px] text-admin-muted">
            Cancelled by {item.cancelledByRole?.toLowerCase() ?? "unknown"}
            {item.cancelReason ? `: ${item.cancelReason}` : "."}
          </p>
        )}

        {item.reportNote && (
          <Callout label={`Parent's report · ${at(item.reportedAt)}`}>{item.reportNote}</Callout>
        )}

        {item.teacherSummary && <Callout label="Teacher's summary">{item.teacherSummary}</Callout>}

        {item.cycle?.status === "CLOSED" && (
          <p className="text-[15px] font-bold text-[#8a6500]">
            This cycle has already closed ({item.cycle.countedSessionCount ?? 0} counted,{" "}
            {item.cycle.forfeitedSessionCount ?? 0} forfeited
            {(item.cycle.excusedSessionCount ?? 0) > 0
              ? `, ${item.cycle.excusedSessionCount} excused with no make-up`
              : ""}
            ). A decision here re-counts it.
          </p>
        )}

        {item.history.length > 0 && (
          <div className="flex flex-col gap-1 border-t border-admin-line-soft pt-3">
            <span className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-admin-muted">
              History
            </span>
            {item.history.map((h) => (
              <p key={h.id} className="text-sm text-admin-muted">
                {at(h.createdAt)} · {h.kind === "OVERRIDE" ? "Override" : "Decision"}:{" "}
                {SESSION_STATUS_LABEL[h.fromStatus]} → {SESSION_STATUS_LABEL[h.toStatus]}
                {h.decidedByName ? ` · ${h.decidedByName}` : ""} — {h.reason}
              </p>
            ))}
          </div>
        )}
      </article>
    </AdminPanel>
  );
}
