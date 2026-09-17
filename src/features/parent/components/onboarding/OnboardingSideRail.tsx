"use client";

import { Check, GraduationCap } from "lucide-react";
import type { OnboardingStep } from "./OnboardingProgress";

interface OnboardingSideRailProps {
  steps: OnboardingStep[];
  currentIndex: number;
  className?: string;
}

/**
 * Vertical step list shown alongside the form on `lg`+ screens, so the wide
 * gray gutter next to a lone centered card isn't just empty space. Mirrors
 * OnboardingProgress's step math but as a sticky rail with room for a
 * description per step. Hidden below `lg`, where the horizontal
 * OnboardingProgress bar is used instead.
 */
export default function OnboardingSideRail({
  steps,
  currentIndex,
  className = "",
}: OnboardingSideRailProps) {
  return (
    <aside className={className}>
      <div className="sticky top-12">
        <div className="flex items-center gap-2 mb-10">
          <div className="flex items-center justify-center size-9 rounded-full bg-violet-600 text-white">
            <GraduationCap className="size-5" />
          </div>
          <span className="text-xl font-extrabold text-gray-900">
            Learn<span className="text-violet-600">ie</span>
          </span>
        </div>

        <ol className="space-y-7">
          {steps.map((step, index) => {
            const isComplete = index < currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <li key={step.path} className="flex items-start gap-3">
                <div
                  className={`flex items-center justify-center size-7 shrink-0 rounded-full border-2 text-xs font-semibold transition-colors ${
                    isComplete
                      ? "bg-violet-600 border-violet-600 text-white"
                      : isCurrent
                        ? "border-violet-600 text-violet-600 bg-white shadow-sm shadow-violet-200"
                        : "border-gray-200 text-gray-400 bg-white"
                  }`}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isComplete ? <Check className="size-3.5" /> : index + 1}
                </div>
                <div className="pt-0.5">
                  <p
                    className={`text-sm font-semibold ${
                      isCurrent
                        ? "text-gray-900"
                        : isComplete
                          ? "text-gray-600"
                          : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </p>
                  {step.description && (
                    <p className="text-xs text-gray-400 mt-0.5 max-w-[180px]">
                      {step.description}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-12 rounded-xl bg-violet-50 border border-violet-100 p-4 max-w-[220px]">
          <p className="text-xs text-violet-700 leading-relaxed">
            Takes about 3 minutes. We use this to match you with the right
            teachers and courses.
          </p>
        </div>
      </div>
    </aside>
  );
}
