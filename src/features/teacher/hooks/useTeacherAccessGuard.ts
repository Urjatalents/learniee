"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  accessRedirectPath,
  fetchTeacherAccess,
} from "@/features/teacher/utils/teacherAccess";

export type TeacherGuardStatus = "checking" | "allowed" | "error";

/**
 * Keeps teachers whose application isn't approved out of the dashboard pages.
 *
 * - Onboarding not finished → onboarding step 1
 * - Pending or rejected     → /teacher/pending-approval
 * - Approved                → allowed (cached, so it isn't re-checked on every click)
 *
 * `enabled` is false for the onboarding / pending-approval pages themselves,
 * which must stay reachable (otherwise we'd redirect in a loop).
 */
export function useTeacherAccessGuard(enabled: boolean, pathname: string | null) {
  const router = useRouter();
  const [status, setStatus] = useState<TeacherGuardStatus>("checking");
  const [attempt, setAttempt] = useState(0);
  const approvedRef = useRef(false);

  useEffect(() => {
    if (!enabled || approvedRef.current) return;

    let cancelled = false;

    async function check() {
      try {
        const access = await fetchTeacherAccess();
        if (cancelled) return;

        const redirectTo = accessRedirectPath(access);

        if (redirectTo) {
          // Stay in "checking" (loading screen) until the navigation happens,
          // so the dashboard never flashes on screen.
          router.replace(redirectTo);
          return;
        }

        approvedRef.current = true;
        setStatus("allowed");
      } catch (error) {
        console.error("Teacher access check failed:", error);
        if (!cancelled) setStatus("error");
      }
    }

    check();

    return () => {
      cancelled = true;
    };
  }, [enabled, pathname, attempt, router]);

  function retry() {
    setStatus("checking");
    setAttempt((n) => n + 1);
  }

  return { status, retry };
}
