"use client";

import { usePathname } from "next/navigation";
import { GraduationCap } from "lucide-react";

import OnboardingProgress, {
  type OnboardingStep,
} from "@/features/parent/components/onboarding/OnboardingProgress";

const STEPS: OnboardingStep[] = [
  { path: "/parent/onboarding/step1", label: "Parent Info" },
  { path: "/parent/onboarding/step2", label: "Child Info" },
  { path: "/parent/onboarding/step3", label: "Additional Info" },
];

/**
 * Deliberately has NO ParentNavbar/ParentSidebar. Onboarding happens before
 * the parent has a real dashboard to navigate to, so the shared dashboard
 * chrome (nav links to Courses/Calendar/Chat/etc.) doesn't apply here and
 * was only ever pulled in because this route sits under `src/app/parent/`.
 * The dashboard itself now lives in the `(dashboard)` route group next to
 * this folder, which is the only place ParentNavbar/ParentSidebar render.
 *
 * Deliberately a single centered column at every breakpoint — an earlier
 * version tried a two-column [sticky rail | card] grid to use up wide-
 * screen space, but a fixed-width rail next to a max-width-capped card
 * inside an open-ended `1fr` track kept producing a lopsided empty gutter
 * on one side no matter how the widths were tuned. A single well-sized
 * centered card is the boring, robust choice: it can't go lopsided,
 * and `max-w-3xl` + generous padding is wide enough to not feel cramped
 * without turning into a huge flat sheet of inputs.
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
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-center gap-2.5 pt-12 pb-8 px-4">
        <div className="flex items-center justify-center size-10 rounded-full bg-violet-600 text-white shadow-sm shadow-violet-600/30">
          <GraduationCap className="size-5" />
        </div>
        <span className="text-2xl font-extrabold text-gray-900">
          Learn<span className="text-violet-600">ie</span>
        </span>
      </header>

      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 pb-20">
        <div className="mb-10">
          <OnboardingProgress steps={STEPS} currentIndex={currentIndex} />
        </div>

        <main className="bg-white border border-gray-100 rounded-3xl shadow-sm shadow-gray-200/70 p-6 sm:p-10 lg:p-12">
          {children}
        </main>
      </div>
    </div>
  );
}
