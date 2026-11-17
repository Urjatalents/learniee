"use client";

import Link from "next/link";

import { kcStyle } from "@/features/parent/components/home/HomeBits";
import { fmtTime } from "@/features/parent/components/home/homeLogic";
import { firstWord } from "@/features/parent/components/my-classes/pdClassesUi";
import type { CalEvent } from "@/features/parent/components/calendar/calendarLogic";

interface Props {
  events: CalEvent[];
  colorOf: (e: CalEvent) => string | null;
}

const ROW =
  "flex w-full items-center gap-3 border-t border-pd-line px-5 py-3 text-left first:border-t-0";

/** Sessions of the selected day (a flush card of rows). */
export default function PdDayList({ events, colorOf }: Props) {
  if (events.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-pd-line bg-white">
        <div className="flex flex-col items-center p-6 text-center">
          <p className="text-sm text-pd-ink3">No sessions on this day.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-pd-line bg-white">
      {events.map((e) => {
        const [time, ap] = e.hasTime ? fmtTime(e.start).split(" ") : ["—", ""];
        const body = (
          <>
            <div className="w-[46px] shrink-0 rounded-lg bg-pd-b50 py-1.5 text-center leading-[1.1]">
              <small className="block text-xs font-semibold text-pd-brand">{ap || "\u00a0"}</small>
              <b className="font-heading text-[15px] font-medium">{time}</b>
            </div>
            <div className="min-w-0 flex-1">
              <b className="block truncate text-sm font-medium">{e.title}</b>
              <small className="flex items-center gap-1.5 text-xs text-pd-ink3">
                {e.teacherName} · {firstWord(e.studentName)}
                {e.kind === "demo" ? " · Demo" : ""}
                {e.state === "held" ? " · Held" : e.state === "missed" ? " · Missed" : ""}
              </small>
            </div>
          </>
        );

        return e.href ? (
          <Link
            key={e.id}
            href={e.href}
            style={kcStyle(colorOf(e))}
            className={`${ROW} transition-colors hover:bg-pd-b50`}
          >
            {body}
          </Link>
        ) : (
          <div key={e.id} style={kcStyle(colorOf(e))} className={ROW}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
