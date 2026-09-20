"use client";

import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  PlayCircle,
  Video,
  XCircle,
} from "lucide-react";

import { useSessionFlow } from "@/features/shared/hooks/useSessionFlow";
import CancelSessionControl from "@/features/shared/components/session-flow/CancelSessionControl";
import {
  describeSession,
  formatSessionRange,
  toActionInput,
  type SessionTone,
} from "@/features/shared/components/session-flow/sessionFlowText";
import { getSessionActions } from "@/features/shared/utils/sessionOutcome";
import type { SessionFlowState } from "@/features/shared/types/sessionFlow";

interface Props {
  role: "teacher" | "parent";
  sessionId: string;
  /** Where "Back to home" goes. */
  homeHref: string;
  /** Rendered instead of the panel when the session is a legacy (pre-cycle) one. */
  renderLegacy: (state: SessionFlowState) => React.ReactNode;
}

const TONE_ICON: Record<SessionTone, React.ReactNode> = {
  info: <Loader2 size={40} className="text-brand" />,
  success: <CheckCircle2 size={40} className="text-green-600" />,
  warn: <AlertTriangle size={40} className="text-amber-500" />,
  danger: <XCircle size={40} className="text-red-500" />,
};

const BUTTON_BASE =
  "w-full flex items-center justify-center gap-2 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 rounded-full transition-colors";
const GREEN_BUTTON = `${BUTTON_BASE} bg-green-600 hover:bg-green-700`;
const BRAND_BUTTON = `${BUTTON_BASE} bg-brand hover:bg-brand-dark`;

/**
 * The minimal Start / End (teacher) and Join (parent) controls for a
 * cycle-model session (Part 1B) — sits on the existing
 * `/teacher/classes/[id]/start` and `/parent/classes/[id]/join`
 * pages. No video room yet (Jitsi is out of scope), so "in the
 * session" just means the event is recorded. Legacy sessions are
 * handed to `renderLegacy` and behave exactly as before.
 *
 * Button availability comes from `getSessionActions` — the same rule
 * the API enforces — but the server always has the final say.
 */
export default function SessionFlowPanel({ role, sessionId, homeHref, renderLegacy }: Props) {
  const router = useRouter();
  const { state, loading, error, busy, now, act } = useSessionFlow(role, sessionId);
  const actorRole = role === "teacher" ? "TEACHER" : "PARENT";

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center">
        <Loader2 size={40} className="animate-spin text-brand mb-4" />
        <p className="text-gray-700 font-semibold">Loading the session…</p>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center">
        <XCircle size={40} className="text-red-500 mb-4" />
        <p className="text-red-600 font-semibold mb-4">
          {error || "This session couldn't be loaded."}
        </p>
        <button
          type="button"
          onClick={() => router.replace(homeHref)}
          className="text-sm font-bold text-white bg-brand hover:bg-brand-dark px-4 py-2.5 rounded-full transition-colors"
        >
          Back to home
        </button>
      </div>
    );
  }

  if (!state.isCycleSession) {
    return <>{renderLegacy(state)}</>;
  }

  const message = describeSession(state, actorRole, now);
  const actions = getSessionActions(actorRole, toActionInput(state), now);
  const isFinal = state.status !== "SCHEDULED";

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border border-violet-100 rounded-3xl shadow-playful p-6 text-center">
        <p className="text-xs font-bold uppercase tracking-wide text-brand">
          {state.scheduledDate} · {formatSessionRange(state)}
        </p>
        <p className="mt-1 text-lg font-bold text-gray-800 truncate">{state.otherPartyName}</p>
        {state.courseTitle && (
          <p className="text-sm text-gray-500 truncate">{state.courseTitle}</p>
        )}

        <div className="flex flex-col items-center mt-6">
          <span className={message.tone === "info" && !isFinal ? "animate-pulse" : undefined}>
            {TONE_ICON[message.tone]}
          </span>
          <p className="mt-3 font-semibold text-gray-800">{message.title}</p>
          <p className="mt-1 text-sm text-gray-500 max-w-xs">{message.body}</p>
          {state.overlapPercent !== null && isFinal && (
            <p className="mt-1 text-xs text-gray-400">
              Time together: {state.overlapPercent}% of the class
            </p>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 space-y-3">
          {role === "teacher" && !isFinal && !state.teacherStartedAt && (
            <button
              type="button"
              disabled={!actions.canStart || busy}
              onClick={() => act("start")}
              className={GREEN_BUTTON}
            >
              <PlayCircle size={18} />
              {busy ? "Starting…" : "Start session"}
            </button>
          )}

          {role === "teacher" && !isFinal && state.teacherStartedAt && (
            <button
              type="button"
              disabled={!actions.canEnd || busy}
              onClick={() => act("end")}
              className={BRAND_BUTTON}
            >
              {busy
                ? "Ending…"
                : actions.endsAsStudentAbsent
                  ? "End — student absent"
                  : "End session"}
            </button>
          )}

          {role === "parent" && !isFinal && !state.studentJoinedAt && (
            <button
              type="button"
              disabled={!actions.canJoin || busy}
              onClick={() => act("join")}
              className={GREEN_BUTTON}
            >
              <Video size={18} />
              {busy ? "Joining…" : "Join session"}
            </button>
          )}
        </div>

        {actions.canCancel && (
          <CancelSessionControl
            busy={busy}
            isLate={actions.cancelIsLate}
            onConfirm={(reason) => act("cancel", { reason })}
          />
        )}

        <button
          type="button"
          onClick={() => router.replace(homeHref)}
          className="mt-5 text-sm font-bold text-gray-600 hover:text-brand"
        >
          Back to home
        </button>
      </div>
    </div>
  );
}
