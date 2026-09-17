"use client";

import { Check } from "lucide-react";

export interface OnboardingStep {
  label: string;
  path: string;
  /** Short blurb shown by OnboardingSideRail on wide screens; unused by this horizontal bar. */
  description?: string;
}

interface OnboardingProgressProps {
  steps: OnboardingStep[];
  currentIndex: number;
}

/**
 * Horizontal 3-step progress indicator for the parent onboarding flow.
 * Purely presentational — driven by the current pathname, not form state,
 * so it stays correct even on a hard refresh mid-step.
 */
export default function OnboardingProgress({
  steps,
  currentIndex,
}: OnboardingProgressProps) {
  return (
    <div>
      <p className="text-xs font-medium text-violet-600 text-center mb-3 sm:hidden">
        Step {currentIndex + 1} of {steps.length} — {steps[currentIndex]?.label}
      </p>
      <ol className="flex items-center w-full">
        {steps.map((step, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <li
              key={step.path}
              className="flex items-center flex-1 last:flex-none"
            >
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex items-center justify-center size-8 rounded-full border-2 text-xs font-semibold transition-colors ${
                    isComplete
                      ? "bg-violet-600 border-violet-600 text-white"
                      : isCurrent
                        ? "border-violet-600 text-violet-600 bg-white shadow-sm shadow-violet-200"
                        : "border-gray-200 text-gray-400 bg-white"
                  }`}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isComplete ? <Check className="size-4" /> : index + 1}
                </div>
                <span
                  className={`hidden sm:inline text-[11px] font-medium whitespace-nowrap ${
                    isCurrent
                      ? "text-violet-700"
                      : isComplete
                        ? "text-gray-600"
                        : "text-gray-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {index < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-2 mb-4 sm:mb-4 rounded-full transition-colors ${
                    isComplete ? "bg-violet-600" : "bg-gray-200"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
