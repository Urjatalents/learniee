"use client";

import { AlertCircle } from "lucide-react";

interface FormErrorBannerProps {
  message: string;
}

/**
 * Small alert box shown above the submit button for form-level errors
 * (failed client-side validation, or a failed API call). Kept as its own
 * component so all three onboarding steps render this identically.
 */
export default function FormErrorBanner({ message }: FormErrorBannerProps) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
    >
      <AlertCircle className="size-4 shrink-0 mt-0.5" />
      <p>{message}</p>
    </div>
  );
}
