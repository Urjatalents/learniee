"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

import { logClientActivity } from "@/features/shared/utils/logClientActivity";
import {
  fetchTeacherAccess,
  postApprovalPath,
} from "@/features/teacher/utils/teacherAccess";

export type ApprovalWatchState = "loading" | "PENDING" | "REJECTED" | "error";

const POLL_INTERVAL_MS = 30_000;

/**
 * Drives the "waiting for admin approval" page: checks the approval status
 * on load, every 30 seconds, and whenever the tab becomes visible again.
 * The moment Admin approves, the teacher is moved on to their dashboard
 * without having to log in again.
 */
export function useTeacherApprovalWatch() {
  const router = useRouter();
  const [state, setState] = useState<ApprovalWatchState>("loading");
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const check = useCallback(async () => {
    setChecking(true);

    try {
      const access = await fetchTeacherAccess();

      if (!access.onboardingComplete) {
        router.replace("/teacher/onboarding/step1");
        return;
      }

      if (access.approvalStatus === "APPROVED") {
        router.replace(postApprovalPath(access));
        return;
      }

      setState(access.approvalStatus === "REJECTED" ? "REJECTED" : "PENDING");
      setLastChecked(new Date());
    } catch (error) {
      console.error("Approval status check failed:", error);
      // Keep showing the last known state if we already had one.
      setState((current) => (current === "loading" ? "error" : current));
    } finally {
      setChecking(false);
    }
  }, [router]);

  useEffect(() => {
    check();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") check();
    }, POLL_INTERVAL_MS);

    function onVisible() {
      if (document.visibilityState === "visible") check();
    }

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [check]);

  async function logout() {
    // Log before removing the cookie — the endpoint needs it to identify the user.
    await logClientActivity("LOGOUT");

    Cookies.remove("idToken");
    localStorage.removeItem("teacherId");

    router.push("/login");
  }

  return { state, checking, lastChecked, check, logout };
}
