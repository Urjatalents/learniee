"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface Props {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Footer buttons keep their own width and sit on one row (confirm dialogs). */
  inlineFooter?: boolean;
}

/**
 * Native <dialog> shell used by the Parent design (modal on desktop, bottom
 * sheet on phones). Mount it only while it should be open; the parent clears
 * its own state in `onClose`.
 */
export default function PdDialog({ title, onClose, children, footer, inlineFooter }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
      className="m-auto max-h-[calc(100dvh-32px)] w-[min(480px,calc(100vw-32px))] overflow-auto rounded-2xl border-0 bg-white p-0 text-pd-ink shadow-[0_16px_40px_-12px_rgba(23,23,43,0.28)] backdrop:bg-[rgba(28,24,51,0.5)] max-sm:mb-0 max-sm:w-screen max-sm:max-w-screen max-sm:rounded-b-none"
    >
      <div className="flex items-start justify-between gap-3 px-6 pb-3 pt-6">
        <h2 id={titleId} className="font-heading text-xl font-semibold leading-tight">
          {title}
        </h2>
        <button
          type="button"
          onClick={() => ref.current?.close()}
          aria-label="Close"
          className="-mr-2 -mt-1.5 grid size-10 shrink-0 place-items-center rounded-[10px] text-pd-ink2 transition-colors hover:bg-pd-b50 hover:text-pd-brand"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex flex-col gap-4 px-6 pb-4">{children}</div>

      {footer && (
        <div
          className={`flex gap-2 px-6 pb-6 pt-3 ${
            inlineFooter
              ? "flex-row flex-wrap justify-end"
              : "flex-col sm:flex-row sm:flex-wrap sm:justify-end"
          }`}
        >
          {footer}
        </div>
      )}
    </dialog>
  );
}
