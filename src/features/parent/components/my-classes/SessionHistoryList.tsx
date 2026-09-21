"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";

import type { ClassSessionItem } from "@/features/parent/types/myClasses";
import { formatPlatformTime } from "@/lib/platformTime";
import { useSessionFlow, type SessionFlowAction } from "@/features/shared/hooks/useSessionFlow";
import SessionAfterClass from "@/features/shared/components/session-flow/SessionAfterClass";
import { describeSession } from "@/features/shared/components/session-flow/sessionFlowText";
import {
  SESSION_STATUS_LABEL,
  SESSION_STATUS_STYLE,
} from "@/features/shared/utils/sessionOutcome";

interface Props {
  sessions: ClassSessionItem[];
  /** Called after an "All good" / "Report a problem", so the page refreshes its counts. */
  onChanged: () => void;
}

/**
 * Session history (Part 2C §1): each class's date, result and the
 * teacher's summary. A class still inside the parent's 48 hours
 * opens with "All good" / "Report a problem" (Part 2A) right there.
 */
export default function SessionHistoryList({ sessions, onChanged }: Props) {
  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
        Class history
      </h2>

      {sessions.length === 0 ? (
        <div className="bg-white border border-violet-100 rounded-2xl p-6 text-center">
          <p className="text-sm text-gray-500">
            No classes yet — each class shows up here with its result once it is over.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <HistoryRow key={session.id} session={session} onChanged={onChanged} />
          ))}
        </div>
      )}
    </section>
  );
}

function classLabel(session: ClassSessionItem) {
  if (session.isMakeup) return "Make-up class";
  if (session.sessionNumber !== null) return `Class ${session.sessionNumber}`;

  return "Class";
}

function HistoryRow({
  session,
  onChanged,
}: {
  session: ClassSessionItem;
  onChanged: () => void;
}) {
  // A class waiting for the parent's answer opens by itself.
  const [open, setOpen] = useState(session.canRespond);

  return (
    <div className="bg-white border border-violet-100 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-800">
            {formatPlatformTime(new Date(session.startsAt), true)}
          </p>
          <p className="text-xs text-gray-400">
            {classLabel(session)}
            {session.cycleNumber !== null && ` · Cycle ${session.cycleNumber}`}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span
            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
              SESSION_STATUS_STYLE[session.status] ?? "bg-gray-100 text-gray-600"
            }`}
          >
            {SESSION_STATUS_LABEL[session.status] ?? session.status}
          </span>

          {session.confirmationPhase === "OPEN" && (
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
              Please confirm
            </span>
          )}
          {session.confirmationPhase === "REPORTED" && (
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-red-100 text-red-600">
              Reported
            </span>
          )}
        </div>
      </div>

      {session.summary ? (
        <div className="mt-3 bg-violet-50/60 border border-violet-100 rounded-xl px-3 py-2">
          <p className="text-[11px] font-bold text-violet-800 mb-0.5">Teacher&apos;s summary</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{session.summary}</p>
        </div>
      ) : (
        session.status === "COMPLETED" && (
          <p className="mt-3 text-xs text-gray-400">
            The teacher hasn&apos;t added a summary for this class.
          </p>
        )
      )}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="mt-3 flex items-center gap-1 text-xs font-bold text-brand hover:underline"
        aria-expanded={open}
      >
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        {open ? "Hide details" : "Details"}
      </button>

      {open && <HistoryDetail sessionId={session.id} onChanged={onChanged} />}
    </div>
  );
}

/** Loaded only while a row is open: the class's outcome explained, and the parent's confirmation controls. */
function HistoryDetail({ sessionId, onChanged }: { sessionId: string; onChanged: () => void }) {
  const { state, loading, error, busy, now, act } = useSessionFlow("parent", sessionId);

  async function handleAct(action: SessionFlowAction, body?: Record<string, unknown>) {
    const ok = await act(action, body);

    if (ok) onChanged();

    return ok;
  }

  if (loading) {
    return (
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
        <Loader2 size={13} className="animate-spin" />
        Loading details…
      </div>
    );
  }

  if (!state) {
    return <p className="mt-3 text-xs text-red-600">{error || "Couldn't load this class."}</p>;
  }

  const message = describeSession(state, "PARENT", now);

  return (
    <div className="mt-3 border-t border-violet-100 pt-3">
      <p className="text-sm font-semibold text-gray-800">{message.title}</p>
      <p className="text-xs text-gray-500 mt-0.5">{message.body}</p>

      {state.overlapPercent !== null && (
        <p className="text-xs text-gray-400 mt-1">Time together: {state.overlapPercent}% of the class</p>
      )}

      {state.confirmation?.phase === "NEEDS_REVIEW" && (
        <p className="text-xs text-gray-500 mt-2">An Admin will decide this class&apos;s result.</p>
      )}

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

      <SessionAfterClass role="parent" state={state} busy={busy} act={handleAct} />

      <Link
        href={`/parent/classes/${sessionId}/join`}
        className="inline-block mt-4 text-xs font-bold text-gray-500 hover:text-brand"
      >
        Open the class page
      </Link>
    </div>
  );
}
