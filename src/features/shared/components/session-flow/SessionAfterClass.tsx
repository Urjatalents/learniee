"use client";

import { useState } from "react";

import { formatPlatformTime } from "@/lib/platformTime";
import type { SessionFlowAction } from "@/features/shared/hooks/useSessionFlow";
import type { SessionFlowState } from "@/features/shared/types/sessionFlow";
import {
  REPORT_NOTE_MAX_LENGTH,
  REPORT_NOTE_MIN_LENGTH,
  SESSION_SUMMARY_MAX_LENGTH,
} from "@/features/shared/utils/outcomeConfirmation";

interface Props {
  role: "teacher" | "parent";
  state: SessionFlowState;
  busy: boolean;
  act: (action: SessionFlowAction, body?: Record<string, unknown>) => Promise<boolean>;
}

const TEXTAREA =
  "mt-2 w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand/30";

/**
 * What happens after a class (Part 2A), on the existing session page:
 *
 *  - Teacher: a short class summary, once they have ended the class.
 *  - Parent: "All good" or "Report a problem" for 48 hours after the
 *    outcome is final. No action means the outcome is accepted.
 *
 * Every rule is decided by the server (`state.confirmation` comes
 * from it); this only draws the controls.
 */
export default function SessionAfterClass({ role, state, busy, act }: Props) {
  const confirmation = state.confirmation;

  if (!confirmation) return null;

  if (role === "teacher") {
    return <TeacherAfterClass state={state} busy={busy} act={act} />;
  }

  return <ParentAfterClass state={state} busy={busy} act={act} />;
}

function windowText(iso: string | null) {
  return iso ? formatPlatformTime(new Date(iso), true) : "";
}

function TeacherAfterClass({ state, busy, act }: Omit<Props, "role">) {
  const confirmation = state.confirmation!;
  const [draft, setDraft] = useState(state.summary ?? "");
  const [saved, setSaved] = useState(false);

  const dirty = draft.trim() !== (state.summary ?? "");

  let statusLine: string | null = null;

  switch (confirmation.phase) {
    case "OPEN":
      statusLine = `Waiting for the parent to confirm. It is accepted automatically after ${windowText(confirmation.windowEndsAt)}.`;
      break;
    case "REPORTED":
      statusLine = "The parent reported a problem with this class. An Admin will review it.";
      break;
    case "NEEDS_REVIEW":
      statusLine = "An Admin will decide this class's outcome.";
      break;
    case "ACCEPTED":
      statusLine = "This class is confirmed.";
      break;
    case "DECIDED":
      statusLine = "An Admin reviewed this class. The result above is final.";
      break;
    default:
      statusLine = null;
  }

  if (!confirmation.canEditSummary && !statusLine) return null;

  return (
    <div className="mt-6 text-left border-t border-violet-100 pt-5">
      {confirmation.canEditSummary && (
        <div>
          <label htmlFor="class-summary" className="text-sm font-bold text-gray-800">
            Class summary
          </label>
          <p className="text-xs text-gray-500 mt-0.5">
            A few lines on what you covered. The class page will show it later.
          </p>
          <textarea
            id="class-summary"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setSaved(false);
            }}
            maxLength={SESSION_SUMMARY_MAX_LENGTH}
            rows={4}
            placeholder="e.g. Covered fractions and did 10 practice questions."
            className={TEXTAREA}
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-[11px] text-gray-400">
              {draft.length}/{SESSION_SUMMARY_MAX_LENGTH}
            </span>
            <div className="flex items-center gap-3">
              {saved && !dirty && <span className="text-xs text-green-600">Saved</span>}
              <button
                type="button"
                disabled={busy || !dirty || draft.trim().length === 0}
                onClick={async () => {
                  const ok = await act("summary", { summary: draft });
                  if (ok) setSaved(true);
                }}
                className="text-xs font-bold text-white bg-brand hover:bg-brand-dark disabled:opacity-50 px-4 py-2 rounded-full"
              >
                {busy ? "Saving…" : state.summary ? "Update summary" : "Save summary"}
              </button>
            </div>
          </div>
        </div>
      )}

      {statusLine && <p className="mt-4 text-xs text-gray-500">{statusLine}</p>}
    </div>
  );
}

function ParentAfterClass({ state, busy, act }: Omit<Props, "role">) {
  const confirmation = state.confirmation!;
  const [reporting, setReporting] = useState(false);
  const [note, setNote] = useState("");

  if (confirmation.phase === "NOT_FINAL" || confirmation.phase === "NEEDS_REVIEW") {
    return null;
  }

  if (confirmation.phase === "REPORTED") {
    return (
      <div className="mt-6 text-left border-t border-violet-100 pt-5">
        <p className="text-sm font-bold text-gray-800">You reported a problem</p>
        <p className="text-xs text-gray-500 mt-1">An Admin will review this class and decide.</p>
        {confirmation.reportNote && (
          <p className="mt-2 text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 whitespace-pre-wrap">
            {confirmation.reportNote}
          </p>
        )}
      </div>
    );
  }

  if (confirmation.phase === "DECIDED") {
    return (
      <div className="mt-6 text-left border-t border-violet-100 pt-5">
        <p className="text-sm font-bold text-gray-800">Reviewed by Admin</p>
        <p className="text-xs text-gray-500 mt-1">An Admin reviewed this class. The result above is final.</p>
      </div>
    );
  }

  if (confirmation.phase === "ACCEPTED") {
    return (
      <div className="mt-6 text-left border-t border-violet-100 pt-5">
        <p className="text-sm font-bold text-gray-800">Confirmed</p>
        <p className="text-xs text-gray-500 mt-1">This class is confirmed. Nothing more to do.</p>
      </div>
    );
  }

  // OPEN: the parent's 48 hours.
  const noteLength = note.trim().length;

  return (
    <div className="mt-6 text-left border-t border-violet-100 pt-5">
      <p className="text-sm font-bold text-gray-800">Is this right?</p>
      <p className="text-xs text-gray-500 mt-1">
        Tell us if the class was recorded wrongly. If you do nothing, it is accepted automatically
        after {windowText(confirmation.windowEndsAt)}.
      </p>

      {!reporting ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !confirmation.canRespond}
            onClick={() => act("confirm")}
            className="text-xs font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 px-4 py-2 rounded-full"
          >
            {busy ? "Saving…" : "All good"}
          </button>
          <button
            type="button"
            disabled={busy || !confirmation.canRespond}
            onClick={() => setReporting(true)}
            className="text-xs font-bold text-red-700 bg-white border border-red-200 hover:bg-red-50 disabled:opacity-50 px-4 py-2 rounded-full"
          >
            Report a problem
          </button>
        </div>
      ) : (
        <div className="mt-3 rounded-2xl border border-red-100 bg-red-50/60 p-4">
          <label htmlFor="report-note" className="text-sm font-semibold text-gray-800">
            What went wrong?
          </label>
          <textarea
            id="report-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={REPORT_NOTE_MAX_LENGTH}
            rows={3}
            placeholder="e.g. I joined on time but the teacher never started."
            className={TEXTAREA}
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy || noteLength < REPORT_NOTE_MIN_LENGTH}
              onClick={async () => {
                const ok = await act("report", { note });
                if (ok) setReporting(false);
              }}
              className="text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 px-4 py-2 rounded-full"
            >
              {busy ? "Sending…" : "Send report"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setReporting(false)}
              className="text-xs font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-full"
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
