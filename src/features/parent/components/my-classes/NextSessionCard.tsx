"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Video } from "lucide-react";

import { useSessionFlow } from "@/features/shared/hooks/useSessionFlow";
import {
  describeSession,
  formatSessionRange,
  toActionInput,
} from "@/features/shared/components/session-flow/sessionFlowText";
import { getSessionActions } from "@/features/shared/utils/sessionOutcome";
import { formatCountdown, formatDateKey } from "@/features/parent/utils/classProgress";

interface Props {
  sessionId: string;
  /** "Session 3 of 9", "Make-up class"… */
  label: string;
  /** Called once the class has an outcome, so the page can refresh its lists. */
  onChanged: () => void;
}

/**
 * The Join button for the next class (Part 2C §1). Same rules as the
 * class's own page: Join unlocks 10 minutes before the start and
 * stays open until the scheduled end. The button state comes from
 * `getSessionActions` — the rule the server enforces — driven by the
 * server-corrected clock in `useSessionFlow`, so it unlocks at the
 * right moment even on a device with a wrong clock. There is no
 * video room yet (Jitsi is out of scope): joining records the time.
 */
export default function NextSessionCard({ sessionId, label, onChanged }: Props) {
  const { state, loading, error, busy, now, act } = useSessionFlow("parent", sessionId);
  const status = state?.status;

  // The class ended (or was cancelled) while the page was open: the
  // outcome is in, so let the page move on to the next class.
  useEffect(() => {
    if (status && status !== "SCHEDULED") onChanged();
  }, [status, onChanged]);

  if (loading) {
    return (
      <div className="bg-white border border-violet-100 rounded-2xl p-5 flex items-center gap-2 text-sm text-gray-500">
        <Loader2 size={16} className="animate-spin text-brand" />
        Loading your next class…
      </div>
    );
  }

  if (!state || !state.isCycleSession || !state.startsAt || !state.endsAt) {
    return (
      <div className="bg-white border border-violet-100 rounded-2xl p-5">
        <p className="text-sm text-red-600">{error || "Your next class couldn't be loaded."}</p>
      </div>
    );
  }

  const message = describeSession(state, "PARENT", now);
  const actions = getSessionActions("PARENT", toActionInput(state), now);
  const opensAt = state.joinOpensAt ? new Date(state.joinOpensAt) : null;
  const beforeOpen = opensAt !== null && now < opensAt;
  const joined = state.studentJoinedAt !== null;

  return (
    <div className="bg-white border border-violet-100 rounded-2xl shadow-playful p-5">
      <p className="text-[11px] font-bold uppercase tracking-wide text-brand">
        Next class · {label}
      </p>

      <p className="font-heading text-lg font-bold text-gray-800 mt-1">
        {formatDateKey(state.scheduledDate)} · {formatSessionRange(state)}
      </p>

      <p className="text-sm font-semibold text-gray-700 mt-3">{message.title}</p>
      <p className="text-xs text-gray-500 mt-0.5">{message.body}</p>

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

      <div className="mt-4">
        {joined ? (
          <p className="flex items-center gap-2 text-sm font-semibold text-green-700">
            <CheckCircle2 size={16} />
            You&apos;ve joined this class
          </p>
        ) : (
          <>
            <button
              type="button"
              disabled={!actions.canJoin || busy}
              onClick={() => act("join")}
              className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-full transition-colors"
            >
              <Video size={16} />
              {busy ? "Joining…" : "Join class"}
            </button>

            {beforeOpen && opensAt && (
              <p className="text-xs text-gray-500 mt-2">
                Join opens in {formatCountdown(opensAt.getTime() - now.getTime())}.
              </p>
            )}
          </>
        )}
      </div>

      {actions.canCancel && (
        <div className="flex flex-wrap gap-4 mt-4 text-xs font-bold">
          <Link href={`/parent/classes/${sessionId}/reschedule`} className="text-brand hover:underline">
            Reschedule
          </Link>
          <Link href={`/parent/classes/${sessionId}/join`} className="text-gray-500 hover:text-brand">
            Cancel this class
          </Link>
        </div>
      )}
    </div>
  );
}
