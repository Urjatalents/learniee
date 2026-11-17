"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { ChevronRight, MessageCircle } from "lucide-react";

import { KidAvatar } from "@/features/parent/components/home/HomeBits";
import { kidColor, whenLabel, dayDiff } from "@/features/parent/components/home/homeLogic";
import type { HomeKid } from "@/features/parent/components/home/homeTypes";
import { subjectTheme, firstWord } from "@/features/parent/components/my-classes/pdClassesUi";
import { PD_BTN_SEC_SM } from "@/features/parent/components/courses/pdUi";
import type { ParentEnrollment } from "@/features/parent/hooks/useEnrollments";
import { displayName } from "@/features/shared/utils/displayName";
import { SESSION_POLICY } from "@/lib/platformConfig";

/** Shared column layout: class | next | progress | actions. */
export const CLASS_ROW_COLS =
  "grid grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1.4fr)_132px] items-center gap-x-[18px] max-[760px]:grid-cols-2";

export function ClassRowsHeader() {
  return (
    <div
      className={`${CLASS_ROW_COLS} border-b border-pd-line bg-pd-bg px-[18px] py-2.5 text-xs font-semibold text-pd-ink3 max-[760px]:hidden`}
    >
      <span>Class</span>
      <span>Next</span>
      <span>Progress</span>
      <span />
    </div>
  );
}

type Kind = "enrolled" | "pending" | "completed";

interface Props {
  enrollment: ParentEnrollment;
  kind: Kind;
  kids: HomeKid[];
  now: Date;
}

const PENDING_STEPS = ["Payment", "Approval", "Ready"];

/** 0 = payment, 1 = approval, 2 = ready. Payment is always done before a row exists. */
function pendingStep(status: string) {
  return status === "APPROVED" ? 2 : 1;
}

/**
 * One row of the My Classes list (design: `.crow`). The title is a
 * stretched link to the class page; the chat icon and Renew button sit
 * above it. Pending rows have no class page yet, so the title is plain.
 */
export default function PdClassRow({ enrollment: e, kind, kids, now }: Props) {
  const subject = e.subject?.trim() || e.course.subject || "";
  const theme = subjectTheme(subject);
  const color = kind === "completed" ? "#a7a2bd" : theme.color;
  const kidId = e.student.id;
  const kidName = firstWord(displayName(e.student));
  const teacherName = displayName(e.teacher);
  const summary = e.classSummary ?? null;
  const progress = summary?.progress ?? null;
  const next = summary?.nextClass ?? null;
  const title = e.course.courseTitle ?? "Untitled course";

  let nx: React.ReactNode;
  let pr: React.ReactNode;
  let renewDue = false;

  if (kind === "enrolled") {
    const nextStart = next ? new Date(next.startsAt) : null;
    const today = nextStart ? dayDiff(nextStart, now) === 0 : false;
    const pct = progress && progress.sessionCount > 0
      ? Math.round((progress.countedSessions / progress.sessionCount) * 100)
      : 0;
    const left = progress && progress.status === "OPEN" ? progress.daysLeft : null;

    renewDue = left !== null && left > 0 && left <= SESSION_POLICY.renewalWindowDays;

    nx = (
      <>
        <small className="text-xs text-pd-ink3">{next?.isMakeup ? "Make-up class" : "Next class"}</small>
        <b className={`text-sm font-semibold ${today ? "text-pd-brand" : ""}`}>
          {nextStart ? whenLabel(nextStart, now) : "—"}
        </b>
      </>
    );
    pr = progress ? (
      <>
        <div className="h-[5px] overflow-hidden rounded-full" style={{ background: `color-mix(in srgb, ${color} 16%, #fff)` }}>
          <i className="block h-full rounded-[inherit]" style={{ width: `${pct}%`, background: color }} />
        </div>
        <small className="text-xs text-pd-ink3">
          Session {progress.nextSessionNumber ?? progress.countedSessions} of {progress.sessionCount}
          {left !== null && left > 0 && left <= 14 && (
            <>
              {" · "}
              <span className="font-semibold text-pd-amber">ends in {left} days</span>
            </>
          )}
        </small>
      </>
    ) : (
      <small className="text-xs text-pd-ink3">No cycle set up yet</small>
    );
  } else if (kind === "pending") {
    const step = pendingStep(e.status);

    nx = (
      <>
        <small className="text-xs text-pd-ink3">Planned start</small>
        <b className="text-sm font-semibold">
          {new Date(e.cycleStartDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
        </b>
      </>
    );
    pr = (
      <>
        <div className="grid grid-cols-3 gap-1">
          {PENDING_STEPS.map((_, i) => (
            <i
              key={i}
              className={`h-[5px] rounded-full ${
                i < step ? "bg-pd-green" : i === step ? "bg-[#d97706]" : "bg-pd-line2"
              }`}
            />
          ))}
        </div>
        <small className="text-xs text-pd-ink3">
          Step {step + 1} of 3 · {PENDING_STEPS[step]}
        </small>
      </>
    );
  } else {
    nx = (
      <>
        <small className="text-xs text-pd-ink3">Result</small>
        <b className="text-sm font-semibold">Completed</b>
      </>
    );
    pr = (
      <>
        <div className="h-[5px] overflow-hidden rounded-full" style={{ background: `color-mix(in srgb, ${color} 16%, #fff)` }}>
          <i className="block h-full w-full rounded-[inherit]" style={{ background: color }} />
        </div>
        <small className="text-xs text-pd-ink3">
          {progress ? `${progress.countedSessions} of ${progress.sessionCount} sessions held` : "Finished"}
        </small>
      </>
    );
  }

  const titleClass =
    "text-left text-[15px] font-semibold leading-[1.3] text-pd-ink";

  return (
    <article
      style={{ "--sc": color } as CSSProperties}
      className={`${CLASS_ROW_COLS} relative border-t border-pd-line px-[18px] py-3.5 transition-colors first:border-t-0 hover:bg-[#faf9fe] max-[760px]:gap-y-3 max-[760px]:px-4`}
    >
      <span className="absolute left-[18px] top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-xl bg-(--sc) text-[15px] font-bold tracking-[-0.02em] text-white max-[760px]:left-4 max-[760px]:top-[26px] max-[760px]:translate-y-0">
        {theme.glyph}
      </span>

      <div className="flex min-w-0 flex-col gap-0.5 pl-[52px] max-[760px]:col-span-full max-[760px]:pr-[90px]">
        {kind === "pending" ? (
          <span className={titleClass}>{title}</span>
        ) : (
          <Link
            href={`/parent/my-classes/${e.id}`}
            className={`${titleClass} after:absolute after:inset-0 after:content-['']`}
          >
            {title}
          </Link>
        )}
        <small className="flex items-center gap-1.5 text-[13px] text-pd-ink3">
          <span className="truncate">{teacherName}</span> ·
          <KidAvatar name={kidName} color={kidColor(kids, kidId)} size="xs" />
          {kidName}
        </small>
      </div>

      <div className="flex min-w-0 flex-col gap-[3px] max-[760px]:col-start-1">{nx}</div>
      <div className="flex min-w-0 flex-col gap-[3px] max-[760px]:col-start-2">{pr}</div>

      <div className="relative z-[2] flex min-w-0 items-center justify-end gap-1 max-[760px]:absolute max-[760px]:right-2.5 max-[760px]:top-2.5">
        {renewDue && (
          <Link href={`/parent/my-classes/${e.id}`} className={PD_BTN_SEC_SM}>
            Renew
          </Link>
        )}
        {e.chatRoom && (
          <Link
            href={`/parent/chat/${e.chatRoom.id}`}
            aria-label={`Message ${teacherName}`}
            className="grid size-[38px] place-items-center rounded-[10px] text-pd-ink2 transition-colors hover:bg-pd-b50 hover:text-pd-brand"
          >
            <MessageCircle size={18} />
          </Link>
        )}
        {kind !== "pending" && (
          <ChevronRight size={18} aria-hidden="true" className="text-pd-ink3 max-[760px]:hidden" />
        )}
      </div>
    </article>
  );
}

