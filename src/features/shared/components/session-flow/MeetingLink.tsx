"use client";

import { ExternalLink, Info, Loader2, RefreshCw, Video } from "lucide-react";

interface NoticeProps {
  enabled: boolean;
  /** Teacher: the Google account that must be used in Meet. */
  accountEmail: string | null;
  /** Parent: the student's name, to enter if Meet asks for one. */
  studentName: string | null;
}

/**
 * Shown before Start / Join. Recording only starts when the teacher is
 * in Meet with their login Google account, and a signed-out guest is
 * asked for a name — so both are spelled out up front.
 */
export function MeetingNotice({ enabled, accountEmail, studentName }: NoticeProps) {
  if (!enabled || (!accountEmail && !studentName)) return null;

  return (
    <div className="flex items-start gap-2 rounded-2xl bg-violet-50 border border-violet-100 px-4 py-3 text-xs text-gray-600">
      <Info size={14} className="mt-0.5 flex-shrink-0 text-brand" />
      {accountEmail ? (
        <p>
          Join Google Meet with <span className="font-bold text-gray-800">{accountEmail}</span>. The
          class is recorded only when you are signed in with this account.
        </p>
      ) : (
        <p>
          If Meet asks for your name, enter{" "}
          <span className="font-bold text-gray-800">{studentName}</span> (copied for you when you
          tap Join). The teacher will let you in.
        </p>
      )}
    </div>
  );
}

interface Props {
  /** Google Meet is switched on for the platform. */
  enabled: boolean;
  /** The class's Meet link, once it exists. */
  uri: string | null;
  /** Teacher only: Meet's confirmation that they are co-host (null for parents). */
  cohost: "CONFIRMED" | "PENDING" | null;
  /** True once this viewer has started (teacher) / joined (parent). */
  present: boolean;
  busy: boolean;
  /** Asks the server to (re)create the room and opens it. */
  onRetry: () => void;
}

/**
 * Only for coming back to a class already started / joined (closed tab,
 * dropped connection). Start / Join themselves go straight into Meet.
 * If the room couldn't be created, offers a retry.
 */
export default function MeetingLink({ enabled, uri, cohost, present, busy, onRetry }: Props) {
  if (!enabled || !present) return null;

  if (uri && cohost === "PENDING") {
    return (
      <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3">
        <p className="text-sm font-semibold text-amber-800">
          Your host controls aren&apos;t confirmed yet.
        </p>
        <p className="mt-1 text-xs text-amber-700">
          Retry so Meet makes you co-host before you enter. If it keeps failing, check that you
          are using the Google account shown above.
        </p>
        <div className="mt-2 flex items-center gap-4">
          <button
            type="button"
            disabled={busy}
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 hover:underline disabled:opacity-50"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Retry host setup
          </button>
          <a
            href={uri}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:underline"
          >
            Join anyway
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    );
  }

  if (uri) {
    return (
      <a
        href={uri}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center justify-center gap-2 text-sm font-bold text-brand bg-violet-50 hover:bg-violet-100 border border-violet-100 px-4 py-3 rounded-full transition-colors"
      >
        <Video size={16} />
        Rejoin class in Google Meet
        <ExternalLink size={13} />
      </a>
    );
  }

  return (
    <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3">
      <p className="text-sm font-semibold text-amber-800">The class link isn&apos;t ready yet.</p>
      <button
        type="button"
        disabled={busy}
        onClick={onRetry}
        className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 hover:underline disabled:opacity-50"
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
        Get the class link
      </button>
    </div>
  );
}
