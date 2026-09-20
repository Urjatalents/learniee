"use client";

import { useState } from "react";

interface Props {
  busy: boolean;
  /** Parent only: cancelling now is inside the 4-hour window, so the class still counts and is charged. */
  isLate: boolean;
  onConfirm: (reason: string) => Promise<boolean>;
}

/**
 * "Cancel this session" — a two-step inline confirm (no
 * `window.confirm`), with an optional reason. Shown only while the
 * session can still be cancelled (before it starts).
 */
export default function CancelSessionControl({ busy, isLate, onConfirm }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 text-xs font-semibold text-gray-500 hover:text-red-600 underline underline-offset-2"
      >
        Cancel this session
      </button>
    );
  }

  return (
    <div className="mt-4 text-left rounded-2xl border border-red-100 bg-red-50/60 p-4">
      <p className="text-sm font-semibold text-gray-800">Cancel this session?</p>
      {isLate && (
        <p className="text-xs text-red-700 mt-1">
          It starts in under 4 hours, so a cancellation now still counts as a class
          and is charged.
        </p>
      )}
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={500}
        rows={2}
        placeholder="Reason (optional)"
        className="mt-2 w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand/30"
      />
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            const done = await onConfirm(reason);
            if (done) setOpen(false);
          }}
          className="text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 px-4 py-2 rounded-full"
        >
          {busy ? "Cancelling…" : "Yes, cancel it"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setOpen(false)}
          className="text-xs font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-full"
        >
          Keep it
        </button>
      </div>
    </div>
  );
}
