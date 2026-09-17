"use client";

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  helperText?: string;
  error?: string;
  /** Span both grid columns on the sm:grid-cols-2 layout used inside FormSection. */
  fullWidth?: boolean;
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
  children,
}: FormFieldProps) {
  return (
    <div className={fullWidth ? "sm:col-span-2" : undefined}>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-gray-700 mb-1.5"
      >
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {helperText && !error && (
        <p className="text-xs text-gray-400 mt-1">{helperText}</p>
      )}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
