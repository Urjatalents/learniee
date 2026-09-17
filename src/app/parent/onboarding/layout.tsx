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
    <div className="min-h-screen bg-gradient-to-b from-violet-50/60 via-gray-50 to-gray-50 flex flex-col">
      <header className="flex items-center justify-center gap-2 pt-10 pb-6 px-4">
        <div className="flex items-center justify-center size-9 rounded-full bg-violet-600 text-white">
          <GraduationCap className="size-5" />
        </div>
        <span className="text-xl font-extrabold text-gray-900">
          Learn<span className="text-violet-600">ie</span>
        </span>
      </header>

      <div className="mx-auto w-full max-w-2xl px-6 mb-8">
        <OnboardingProgress steps={STEPS} currentIndex={currentIndex} />
      </div>

      <main className="flex-1 px-4 pb-16">
        <div className="mx-auto w-full max-w-2xl bg-white border border-gray-100 rounded-2xl shadow-sm shadow-gray-200/60 p-6 sm:p-10">
          {children}
        </div>
      </main>
    </div>
  );
}
