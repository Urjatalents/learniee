interface Props {
  label: string;
  /** Must match the control's `id`, so clicking the label focuses it. */
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}

/** Label + control + optional hint, used by every create-course field. */
export default function FormField({ label, htmlFor, required, hint, className = "", children }: Props) {
  return (
    <div className={`space-y-1.5 min-w-0 ${className}`.trim()}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700">
        {label}
        {required && (
          <span className="text-red-500 ml-0.5" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {children}

      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

/** Shared control styling so Input / SelectField / textarea line up (all h-10). */
export const controlClass = "h-10 text-sm bg-white";
export const textareaClass =
  "w-full rounded-lg border border-input bg-white px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-y";
