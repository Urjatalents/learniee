"use client";

import type { ClassSessionItem } from "@/features/parent/types/myClasses";
import { formatDateTile } from "@/features/shared/utils/classTimeLabels";
import { formatPlatformTime } from "@/lib/platformTime";
import {
  SESSION_STATUS_LABEL,
  SESSION_STATUS_STYLE,
} from "@/features/shared/utils/sessionOutcome";

interface Props {
  sessions: ClassSessionItem[];
}

function classLabel(session: ClassSessionItem) {
  if (session.isMakeup) return "Make-up class";
  if (session.sessionNumber !== null) return `Class ${session.sessionNumber}`;

  return "Class";
}

/**
 * A student's class history, Teacher side — read-only (the
 * confirm/report actions on the Parent's equivalent list belong to
 * the Parent; the Teacher just sees the result and their own
 * summary, same as the class review Admin sees).
 */
export default function ClassHistoryList({ sessions }: Props) {
  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">
        Class history
      </h2>

      {sessions.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-violet-200 rounded-2xl p-6 text-center">
          <p className="text-sm text-gray-500">
            No classes yet — each one shows up here with its result once it&apos;s over.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => {
            const start = new Date(session.startsAt);
            const tile = formatDateTile(start);

            return (
              <div
                key={session.id}
                className="flex items-start gap-3 bg-white border border-violet-100 rounded-2xl px-3 py-2.5"
              >
                <span className="w-12 flex-shrink-0 rounded-xl bg-gray-50 border border-gray-100 text-center py-1">
                  <span className="block text-[10px] font-bold uppercase text-gray-400 leading-tight">
                    {tile.month}
                  </span>
                  <span className="block font-heading text-lg font-bold text-gray-700 leading-tight">
                    {tile.day}
                  </span>
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-800">
                      {classLabel(session)} · {formatPlatformTime(start)}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SESSION_STATUS_STYLE[session.status]}`}
                    >
                      {SESSION_STATUS_LABEL[session.status]}
                    </span>
                  </div>

                  {session.summary && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{session.summary}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
