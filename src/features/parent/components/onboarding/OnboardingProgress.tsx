"use client";

import { Check } from "lucide-react";

export interface OnboardingStep {
  label: string;
  path: string;
}

interface OnboardingProgressProps {
  steps: OnboardingStep[];
  currentIndex: number;
}

/**
 * Horizontal step indicator for the parent onboarding flow. Purely
 * presentational — driven by the current pathname, not form state, so it
 * stays correct even on a hard refresh mid-step. One markup path for every
 * screen size (step circle + label, always visible) rather than a
 * mobile-only text line plus a desktop-only label, so there's a single
 * thing to get right instead of two variants that can drift apart.
 */
export default function OnboardingProgress({
  steps,
  currentIndex,
}: OnboardingProgressProps) {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-wider text-violet-600 text-center mb-4 uppercase">
        Step {currentIndex + 1} of {steps.length}
      </p>
      <ol className="flex items-start w-full">
        {steps.map((step, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <li
              key={step.path}
              className="flex items-center flex-1 last:flex-none"
            >
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`flex items-center justify-center size-9 rounded-full border-2 text-sm font-semibold transition-colors ${
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
                  className={`text-[11px] sm:text-xs font-medium text-center max-w-[84px] leading-tight ${
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
                  className={`h-0.5 flex-1 mx-2 mb-6 rounded-full transition-colors ${
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
