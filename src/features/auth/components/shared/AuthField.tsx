"use client";

import { useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";

interface AuthFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "placeholder"> {
  label: string;
  error?: string;
  /** Rendered inside the field's right edge (e.g. the show/hide button). */
  trailing?: ReactNode;
}

/** Underline-style labelled input used on the login and signup pages. */
export default function AuthField({
  label,
  error,
  trailing,
  className = "",
  ...props
}: AuthFieldProps) {
  const id = useId();
  return (
    <div>
      <label
        htmlFor={id}
        className={`block text-xs font-bold ${error ? "text-[#e5484d]" : "text-[#6f6a82]"}`}
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          className={`w-full border-0 border-b-2 bg-transparent py-1.5 pr-8 text-base font-semibold text-[#1b1530] outline-none transition-colors focus:border-[#7e2bf1] disabled:opacity-60 ${
            error ? "border-[#e5484d]" : "border-[#d9d4e6]"
          } ${className}`}
          {...props}
        />
        {trailing}
      </div>
      {error && <p className="mt-1 text-xs text-[#e5484d]">{error}</p>}
    </div>
  );
}
