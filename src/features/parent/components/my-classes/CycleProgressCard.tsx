"use client";

import CycleProgressRing from "@/features/shared/components/CycleProgressRing";
import type { CycleProgressView } from "@/features/parent/types/myClasses";
import { formatDateKeyShort } from "@/features/parent/utils/classProgress";

interface Props {
  progress: CycleProgressView | null;
}

/**
 * Where the current cycle stands (Part 2C §1): "Session 3 of 9" and
 * the days left of the 45-day window. All numbers are computed on
 * the server from the cycle and its real sessions.
 */
export default function CycleProgressCard({ progress }: Props) {
  if (!progress) {
    return (
      <div className="bg-white border border-violet-100 rounded-3xl p-5">
        <p className="text-sm text-gray-500">No cycle has been set up for this enrollment yet.</p>
      </div>
    );
  }

  const { countedSessions, sessionCount } = progress;
  const closed = progress.status === "CLOSED";
  const complete = sessionCount > 0 && countedSessions >= sessionCount;

  const headline =
    progress.nextSessionNumber !== null
      ? `Session ${progress.nextSessionNumber} of ${sessionCount}`
      : complete
        ? "All classes held"
        : `${countedSessions} of ${sessionCount} classes held`;

  let windowText: string;

  if (closed) {
    windowText = "This cycle is closed.";
  } else if (progress.dayOfWindow === 0) {
    windowText = `Starts on ${formatDateKeyShort(progress.startDate)}.`;
  } else if (progress.daysLeft === 0) {
    windowText = `The ${progress.windowDays}-day window has ended.`;
  } else {
    windowText = `Day ${progress.dayOfWindow} of ${progress.windowDays} · ${progress.daysLeft} day${
      progress.daysLeft === 1 ? "" : "s"
    } left`;
  }

  const windowPercent =
    progress.windowDays > 0
      ? Math.min(100, Math.round((progress.dayOfWindow / progress.windowDays) * 100))
      : 0;
  const runningOut = !closed && progress.dayOfWindow > 0 && progress.daysLeft <= 7;

  return (
    <div className="bg-white border border-violet-100 rounded-3xl p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-brand">
          Cycle {progress.cycleNumber}
        </p>
        <p className="text-xs text-gray-400">
          {formatDateKeyShort(progress.startDate)} to {formatDateKeyShort(progress.endDate)}
        </p>
      </div>

      <div className="flex items-center gap-4 mt-4">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={sessionCount}
          aria-valuenow={countedSessions}
          aria-label="Classes held this cycle"
        >
          <CycleProgressRing
            completed={countedSessions}
            total={sessionCount}
            size={88}
            strokeWidth={8}
          />
        </div>

        <div className="min-w-0">
          <p className="font-heading text-xl font-bold text-gray-800 leading-tight">{headline}</p>
          <p className="text-xs text-gray-500 mt-1">
            {countedSessions} of {sessionCount} classes counted
          </p>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-violet-100">
        <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-gray-500 mb-1.5">
          <span>{progress.windowDays}-day window</span>
          <span className={runningOut ? "text-amber-700" : undefined}>{windowText}</span>
        </div>

        <div
          className="h-1.5 rounded-full bg-gray-100 overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={progress.windowDays}
          aria-valuenow={progress.dayOfWindow}
          aria-label="Days used in the cycle window"
        >
          <div
            className={`h-full rounded-full ${runningOut ? "bg-amber-400" : "bg-brand-light"}`}
            style={{ width: `${windowPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
