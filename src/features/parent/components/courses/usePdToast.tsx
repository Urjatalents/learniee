"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";

/** Tiny toast for the Parent design. Render `toastNode` once in the view. */
export function usePdToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((msg: string) => {
    setMessage(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 3200);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const toastNode = (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-[88px] left-1/2 z-[120] flex w-[calc(100%-32px)] max-w-[420px] -translate-x-1/2 flex-col items-center sm:bottom-6"
    >
      {message && (
        <div className="flex items-center gap-3 rounded-xl bg-pd-ink px-4 py-3 text-sm font-bold text-white shadow-[0_16px_40px_-12px_rgba(23,23,43,0.28)]">
          <Check size={18} strokeWidth={2.5} className="shrink-0 text-[#86efac]" />
          <span>{message}</span>
        </div>
      )}
    </div>
  );

  return { toast, toastNode };
}
