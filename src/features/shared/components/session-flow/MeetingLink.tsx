"use client";

import { ExternalLink, Loader2, RefreshCw, Video } from "lucide-react";

interface Props {
  /** Google Meet is switched on for the platform. */
  enabled: boolean;
  /** The class's Meet link, once it exists. */
  uri: string | null;
  /** True once this viewer has started (teacher) / joined (parent). */
  present: boolean;
  busy: boolean;
  /** Asks the server to (re)create the room — Start / Join are repeatable. */
  onRetry: () => void;
}

/**
 * The "open the class" button of a live session. Shown only after the
 * viewer's Start / Join was recorded. If the room couldn't be created
 * (Google hiccup) the class itself is unaffected — this offers a retry.
 */
export default function MeetingLink({ enabled, uri, present, busy, onRetry }: Props) {
  if (!enabled || !present) return null;

  if (uri) {
    return (
      <a
        href={uri}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center justify-center gap-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 px-4 py-3.5 rounded-full transition-colors"
      >
        <Video size={18} />
        Open class in Google Meet
        <ExternalLink size={14} />
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
