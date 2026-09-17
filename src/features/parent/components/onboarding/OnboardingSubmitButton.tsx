"use client";

import { Loader2 } from "lucide-react";

interface OnboardingSubmitButtonProps {
  submitting: boolean;
  label: string;
  submittingLabel: string;
}

/** Primary submit button shared by all three onboarding steps. */
export default function OnboardingSubmitButton({
  submitting,
  label,
  submittingLabel,
}: OnboardingSubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={submitting}
      className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white font-medium text-sm py-2.5 w-full rounded-lg shadow-sm shadow-violet-600/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {submitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {submitting ? submittingLabel : label}
    </button>
  );
}
