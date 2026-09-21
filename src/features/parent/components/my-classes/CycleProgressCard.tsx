"use client";

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
      <div className="bg-white border border-violet-100 rounded-2xl p-5">
        <p className="text-sm text-gray-500">No cycle has been set up for this enrollment yet.</p>
      </div>
    );
  }

  const { countedSessions, sessionCount } = progress;
  const percent = sessionCount > 0 ? Math.min(100, Math.round((countedSessions / sessionCount) * 100)) : 0;
  const closed = progress.status === "CLOSED";

  const headline =
    progress.nextSessionNumber !== null
      ? `Session ${progress.nextSessionNumber} of ${sessionCount}`
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

  return (
    <div className="bg-white border border-violet-100 rounded-2xl p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
          Cycle {progress.cycleNumber}
        </p>
        <p className="text-xs text-gray-400">
          {formatDateKeyShort(progress.startDate)} to {formatDateKeyShort(progress.endDate)}
        </p>
      </div>

      <p className="font-heading text-2xl font-bold text-gray-800 mt-1">{headline}</p>

      <div
        className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={sessionCount}
        aria-valuenow={countedSessions}
        aria-label="Classes held this cycle"
      >
        <div className="h-full bg-brand rounded-full" style={{ width: `${percent}%` }} />
      </div>

      <p className="text-xs text-gray-500 mt-2">{windowText}</p>
    </div>
  );
}
