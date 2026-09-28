"use client";

import { usePathname } from "next/navigation";
import BrandLogo from "@/features/shared/components/BrandLogo";

import OnboardingProgress, {
  type OnboardingStep,
} from "@/features/parent/components/onboarding/OnboardingProgress";

const STEPS: OnboardingStep[] = [
  { path: "/teacher/onboarding/step1", label: "Personal Info" },
  { path: "/teacher/onboarding/step2", label: "Professional Info" },
  { path: "/teacher/onboarding/step3", label: "Documents" },
];

/**
 * Mirrors `src/app/parent/onboarding/layout.tsx`: a single centered card with
 * a step indicator on top and no Navbar/Sidebar (the parent `teacher/layout.tsx`
 * skips its dashboard chrome for `/teacher/onboarding/*`).
 *
 * The step indicator is reused from the Parent onboarding feature — it is
 * purely presentational and driven by the pathname.
 */
export default function TeacherOnboardingLayout({
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
        <BrandLogo className="h-12 w-auto" priority />
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
