/**
 * Helpers for gating the Teacher area until Admin has approved the
 * application. The data comes from GET /api/teacher/onboarding/status
 * (the same route the login flow already uses).
 */

export type TeacherApprovalState = "PENDING" | "APPROVED" | "REJECTED" | null;

export interface TeacherAccess {
  onboardingComplete: boolean;
  approvalStatus: TeacherApprovalState;
  bankAccountStatus: string;
}

export async function fetchTeacherAccess(): Promise<TeacherAccess> {
  const res = await fetch("/api/teacher/onboarding/status", {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Unable to check your account status.");
  }

  const data = await res.json();

  return {
    onboardingComplete: Boolean(data.onboardingComplete),
    approvalStatus: data.approvalStatus ?? null,
    bankAccountStatus: data.bankAccountStatus ?? "MISSING",
  };
}

/**
 * Where a teacher who is NOT allowed into the dashboard should be sent,
 * or `null` if they are approved and may stay.
 */
export function accessRedirectPath(access: TeacherAccess): string | null {
  if (!access.onboardingComplete) return "/teacher/onboarding/step1";
  if (access.approvalStatus === "APPROVED") return null;
  return "/teacher/pending-approval";
}

/** First screen for a teacher who has just been approved (same rule as the login flow). */
export function postApprovalPath(access: TeacherAccess): string {
  return access.bankAccountStatus === "MISSING"
    ? "/teacher/bank-account"
    : "/teacher";
}
