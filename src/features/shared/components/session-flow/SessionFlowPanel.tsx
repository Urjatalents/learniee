"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  PlayCircle,
  Video,
  XCircle,
} from "lucide-react";

import { useSessionFlow } from "@/features/shared/hooks/useSessionFlow";
import CancelSessionControl from "@/features/shared/components/session-flow/CancelSessionControl";
import SessionAfterClass from "@/features/shared/components/session-flow/SessionAfterClass";
import {
  describeSession,
  formatSessionRange,
  toActionInput,
  type SessionTone,
} from "@/features/shared/components/session-flow/sessionFlowText";
import {
  formatCountdown,
  formatLongDate,
  minutesBetween,
} from "@/features/shared/utils/classTimeLabels";
import { SESSION_STATUS_LABEL, getSessionActions } from "@/features/shared/utils/sessionOutcome";
import type { SessionFlowState } from "@/features/shared/types/sessionFlow";
import { SESSION_POLICY } from "@/lib/platformConfig";
import { formatPlatformTime } from "@/lib/platformTime";

interface Props {
  role: "teacher" | "parent";
  sessionId: string;
  /** Where "Back to home" goes. */
  homeHref: string;
  /** Rendered instead of the panel when the session is a legacy (pre-cycle) one. */
  renderLegacy: (state: SessionFlowState) => React.ReactNode;
}

const TONE_BADGE: Record<SessionTone, string> = {
  info: "bg-violet-100 text-brand",
  success: "bg-green-100 text-green-600",
  warn: "bg-amber-100 text-amber-600",
  danger: "bg-red-100 text-red-500",
};

const BUTTON_BASE =
  "w-full flex items-center justify-center gap-2 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3.5 rounded-full transition-colors";
const GREEN_BUTTON = `${BUTTON_BASE} bg-green-600 hover:bg-green-700`;
const BRAND_BUTTON = `${BUTTON_BASE} bg-brand hover:bg-brand-dark`;

const HEADER_CHIP =
  "inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-white/15 border border-white/20 rounded-full px-3 py-1.5";

const PAGE = "p-4 sm:p-8 max-w-4xl mx-auto";

function timeOf(iso: string | null) {
  return iso ? formatPlatformTime(new Date(iso)) : "";
}

interface TimelineStep {
  key: string;
  label: string;
  detail: string;
  done: boolean;
}

/**
 * The Start / End (teacher) and Join (parent) page for a cycle-model
 * session (Part 1B) — sits on the existing
 * `/teacher/classes/[id]/start` and `/parent/classes/[id]/join`
 * pages. No video room yet (Jitsi is out of scope), so "in the
 * session" just means the event is recorded. Legacy sessions are
 * handed to `renderLegacy` and behave exactly as before.
 *
 * Layout: a header with who / what / when, then the live status and
 * its action buttons next to a small timeline of what has happened so
 * far. After the class, the summary (teacher) or "All good" (parent)
 * of Part 2A sits inside the status card.
 *
 * Button availability comes from `getSessionActions` — the same rule
 * the API enforces — but the server always has the final say.
 */
export default function SessionFlowPanel({ role, sessionId, homeHref, renderLegacy }: Props) {
  const router = useRouter();
  const { state, loading, error, busy, now, act } = useSessionFlow(role, sessionId);
  const actorRole = role === "teacher" ? "TEACHER" : "PARENT";
  const isTeacher = role === "teacher";

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

  const startsAt = state.startsAt ? new Date(state.startsAt) : null;
  const opensAt = state.joinOpensAt ? new Date(state.joinOpensAt) : null;
  const beforeOpen = opensAt !== null && now < opensAt;
  const recording = !isFinal && state.teacherEndedAt !== null;

  const statusLabel = isFinal
    ? (SESSION_STATUS_LABEL[state.status] ?? state.status)
    : state.teacherStartedAt
      ? "In progress"
      : "Scheduled";

  const lengthMinutes =
    state.startsAt && state.endsAt ? minutesBetween(state.startsAt, state.endsAt) : null;

  let statusIcon: React.ReactNode;

  if (recording) {
    statusIcon = <Loader2 size={24} className="animate-spin" />;
  } else if (message.tone === "success") {
    statusIcon = <CheckCircle2 size={24} />;
  } else if (message.tone === "warn") {
    statusIcon = <AlertTriangle size={24} />;
  } else if (message.tone === "danger") {
    statusIcon = <XCircle size={24} />;
  } else {
    statusIcon = <Clock size={24} className={isFinal ? undefined : "animate-pulse"} />;
  }

  const steps: TimelineStep[] = [
    {
      key: "opens",
      label: isTeacher ? "Start opens" : "Join opens",
      detail: `${timeOf(state.joinOpensAt)} · ${SESSION_POLICY.joinOpensMinutesBefore} min before the class`,
      done: !beforeOpen || state.teacherStartedAt !== null || state.studentJoinedAt !== null,
    },
    {
      key: "teacher",
      label: isTeacher ? "You started" : "Teacher started",
      detail: state.teacherStartedAt ? `At ${timeOf(state.teacherStartedAt)}` : "Not started yet",
      done: state.teacherStartedAt !== null,
    },
    {
      key: "student",
      label: isTeacher ? "Student joined" : "You joined",
      detail: state.studentJoinedAt ? `At ${timeOf(state.studentJoinedAt)}` : "Not joined yet",
      done: state.studentJoinedAt !== null,
    },
    {
      key: "end",
      label: isFinal ? (SESSION_STATUS_LABEL[state.status] ?? "Finished") : "Class ends",
      detail: state.teacherEndedAt
        ? `Ended at ${timeOf(state.teacherEndedAt)}`
        : `Scheduled for ${timeOf(state.endsAt)}`,
      done: isFinal || state.teacherEndedAt !== null,
    },
  ];

  const currentStep = steps.findIndex((step) => !step.done);

  return (
    <div className={PAGE}>
      <Link
        href={homeHref}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft size={14} /> Back to home
      </Link>

      {/* HEADER — who, what, when */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand via-brand to-violet-800 p-5 sm:p-6 text-white shadow-playful">
        <div className="pointer-events-none absolute inset-0 bg-dot-pattern text-white/10" />
        <div className="pointer-events-none absolute -top-10 -right-10 w-44 h-44 rounded-full bg-brand-yellow/20 blur-2xl" />

        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-white/70">
              {isTeacher ? "Class with your student" : "Class with your teacher"}
            </p>
            <h1 className="font-heading text-xl sm:text-2xl font-bold leading-snug truncate">
              {state.otherPartyName}
            </h1>
            {state.courseTitle && (
              <p className="text-sm text-white/80 truncate">{state.courseTitle}</p>
            )}
          </div>

          <span className="flex-shrink-0 text-xs font-bold px-3 py-1 rounded-full bg-white text-brand-dark">
            {statusLabel}
          </span>
        </div>

        <div className="relative flex flex-wrap gap-2 mt-5">
          <span className={HEADER_CHIP}>
            <CalendarClock size={13} />
            {startsAt ? formatLongDate(startsAt) : state.scheduledDate}
          </span>
          <span className={HEADER_CHIP}>
            <Clock size={13} />
            {formatSessionRange(state)}
          </span>
          {lengthMinutes !== null && lengthMinutes > 0 && (
            <span className={HEADER_CHIP}>{lengthMinutes} min</span>
          )}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-5 items-start mt-5">
        {/* STATUS + ACTIONS */}
        <div className="md:col-span-3 bg-white border border-violet-100 rounded-3xl shadow-playful p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span
              className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                TONE_BADGE[recording ? "info" : message.tone]
              }`}
            >
              {statusIcon}
            </span>

            <div className="min-w-0">
              <p className="font-heading text-lg font-bold text-gray-800 leading-tight">
                {message.title}
              </p>
              <p className="mt-1 text-sm text-gray-500">{message.body}</p>
              {state.overlapPercent !== null && isFinal && (
                <p className="mt-1 text-xs text-gray-400">
                  Time together: {state.overlapPercent}% of the class
                </p>
              )}
            </div>
          </div>

          {!isFinal && beforeOpen && opensAt && (
            <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-violet-50 border border-violet-100 px-4 py-3">
              <span className="text-xs font-semibold text-gray-500">
                {isTeacher ? "Start opens in" : "Join opens in"}
              </span>
              <span className="font-heading text-xl font-bold text-brand tabular-nums">
                {formatCountdown(opensAt.getTime() - now.getTime())}
              </span>
            </div>
          )}

          {error && (
            <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <div className="mt-5 space-y-3">
            {isTeacher && !isFinal && !state.teacherStartedAt && (
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

            {isTeacher && !isFinal && state.teacherStartedAt && (
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

            {!isTeacher && !isFinal && !state.studentJoinedAt && (
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

          {/* Part 2A: teacher summary / parent confirmation, after the class. */}
          <SessionAfterClass role={role} state={state} busy={busy} act={act} />
        </div>

        {/* TIMELINE */}
        <div className="md:col-span-2 bg-white border border-violet-100 rounded-3xl p-5">
          <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-4">
            Session timeline
          </h2>

          <ol>
            {steps.map((step, index) => {
              const current = index === currentStep && !isFinal;

              return (
                <li key={step.key} className="relative flex gap-3 pb-5 last:pb-0">
                  {index < steps.length - 1 && (
                    <span
                      className={`absolute left-[11px] top-6 bottom-0 w-0.5 ${
                        step.done ? "bg-green-200" : "bg-violet-100"
                      }`}
                    />
                  )}

                  <span
                    className={`relative w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      step.done
                        ? "bg-green-500 text-white"
                        : current
                          ? "bg-brand text-white"
                          : "bg-gray-100 text-gray-300"
                    }`}
                  >
                    {step.done ? <Check size={13} strokeWidth={3} /> : <Circle size={7} />}
                  </span>

                  <div className="min-w-0">
                    <p
                      className={`text-sm font-semibold ${
                        step.done || current ? "text-gray-800" : "text-gray-400"
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="text-xs text-gray-500">{step.detail}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
