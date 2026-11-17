import type { ReactNode } from "react";

import { PD_ERR, PD_LABEL } from "@/features/parent/components/courses/pdUi";

/**
 * Parent-design form field (design `.field`): label, the control, an optional hint and an
 * inline error. Pass the control as `children` and give it the same `id`.
 */
export default function PdField({
  id,
  label,
  hint,
  error,
  className = "",
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-2 ${className}`}>
      <label htmlFor={id} className={PD_LABEL}>
        {label}
      </label>
      {children}
      {hint && !error && <span className="text-xs text-pd-ink3">{hint}</span>}
      {error && (
        <span role="alert" className={PD_ERR}>
          {error}
        </span>
      )}
    </div>
  );
}
