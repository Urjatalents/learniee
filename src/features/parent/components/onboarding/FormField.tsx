"use client";

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  helperText?: string;
  error?: string;
  /** Span both grid columns on the sm:grid-cols-2 layout used inside FormSection. */
  fullWidth?: boolean;
  /** Small pill rendered next to the label, e.g. an "Auto-filled" flag. */
  badge?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Wraps a single form control with a consistent label, required-marker,
 * optional helper copy, and error text — so individual step pages don't
 * repeat this markup per field.
 */
export default function FormField({
  label,
  htmlFor,
  required,
  helperText,
  error,
  fullWidth,
  badge,
  children,
}: FormFieldProps) {
  return (
    <div className={fullWidth ? "sm:col-span-2" : undefined}>
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5"
      >
        <span>
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </span>
        {badge}
      </label>
      {children}
      {helperText && !error && (
        <p className="text-xs text-gray-400 mt-1">{helperText}</p>
      )}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
