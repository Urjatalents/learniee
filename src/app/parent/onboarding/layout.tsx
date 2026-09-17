"use client";

import { usePathname } from "next/navigation";
import { GraduationCap } from "lucide-react";

import OnboardingProgress, {
  type OnboardingStep,
} from "@/features/parent/components/onboarding/OnboardingProgress";
import OnboardingSideRail from "@/features/parent/components/onboarding/OnboardingSideRail";

const STEPS: OnboardingStep[] = [
  {
    path: "/parent/onboarding/step1",
    label: "Parent Info",
    description: "How teachers and Learnie reach you",
  },
  {
    path: "/parent/onboarding/step2",
    label: "Child Info",
    description: "Who'll be learning",
  },
  {
    path: "/parent/onboarding/step3",
    label: "Additional Info",
    description: "Helps us recommend the right fit",
  },
];

/**
 * Deliberately has NO ParentNavbar/ParentSidebar. Onboarding happens before
 * the parent has a real dashboard to navigate to, so the shared dashboard
 * chrome (nav links to Courses/Calendar/Chat/etc.) doesn't apply here and
 * was only ever pulled in because this route sits under `src/app/parent/`.
 * The dashboard itself now lives in the `(dashboard)` route group next to
 * this folder, which is the only place ParentNavbar/ParentSidebar render.
 *
 * Layout: below `lg` this is a single centered card with a horizontal step
 * bar on top (OnboardingProgress), same as before. At `lg`+, a sticky
 * vertical step rail (OnboardingSideRail) sits to the left of the form.
 *
 * The outer container is deliberately capped at max-w-5xl rather than
 * being wide-open: the rail is a fixed 240px, so `max-w-5xl` is sized to
 * roughly match rail + gap + the form's natural width, and the form card
 * fills its grid column edge-to-edge (no inner max-w) instead of floating
 * left with empty space to its right. The whole rail+card block is then
 * centered as one unit on very wide screens, so any leftover gutter is
 * symmetric left/right rather than piling up on one side.
 */
export default function ParentOnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const currentIndex = Math.max(
    0,
    STEPS.findIndex((step) => pathname?.startsWith(step.path)),
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50/60 via-gray-50 to-gray-50">
      <header className="flex items-center justify-center gap-2 pt-10 pb-2 px-4 lg:hidden">
        <div className="flex items-center justify-center size-9 rounded-full bg-violet-600 text-white">
          <GraduationCap className="size-5" />
        </div>
        <span className="text-xl font-extrabold text-gray-900">
          Learn<span className="text-violet-600">ie</span>
        </span>
      </header>

      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-10 py-8 lg:py-14">
        <div className="mb-8 lg:hidden">
          <OnboardingProgress steps={STEPS} currentIndex={currentIndex} />
        </div>

        <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-14">
          <OnboardingSideRail
            steps={STEPS}
            currentIndex={currentIndex}
            className="hidden lg:block"
          />

          <main>
            <div className="w-full max-w-2xl mx-auto lg:max-w-none lg:mx-0 bg-white border border-gray-100 rounded-2xl shadow-sm shadow-gray-200/60 p-6 sm:p-10">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
