import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCognitoAuth } from "@/lib/api-auth";
import { isAppealOpen } from "@/features/teacher/utils/teacherAppeal";

export async function GET(req: Request) {
  try {
    const auth = requireCognitoAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    // Find teacher using Cognito ID
    const teacher = await prisma.teacher.findUnique({
      where: {
        cognitoId: auth.payload.sub,
      },
      select: {
        id: true,
        currentStep: true,
        onboardingStatus: true,
        approvalStatus: true,
        interviewScheduledAt: true,
        interviewDetails: true,
        reapplyAvailableAt: true,
        // Bank Account Approval (Sep 10, 2026) — the login flow uses
        // this to send a newly-approved Teacher to fill in payout
        // details as their first required step (see useLogin.ts).
        // Only the status is needed here, not the account details
        // themselves.
        bankAccount: { select: { status: true } },
      },
    });

    // Teacher has not created an RDS record yet
    if (!teacher) {
      return NextResponse.json({
        onboardingComplete: false,
        currentStep: 0,
        onboardingStatus: "NOT_STARTED",
        approvalStatus: null,
        bankAccountStatus: "MISSING",
      });
    }

    return NextResponse.json({
      // We calculate this instead of storing another column
      onboardingComplete:
        teacher.onboardingStatus === "COMPLETED",

      currentStep: teacher.currentStep,

      onboardingStatus:
        teacher.onboardingStatus,

      approvalStatus:
        teacher.approvalStatus,

      // "MISSING" (never submitted) / "PENDING" / "APPROVED" / "REJECTED"
      bankAccountStatus: teacher.bankAccount?.status ?? "MISSING",

      // Interview + appeal (Oct 7, 2026)
      interviewScheduledAt: teacher.interviewScheduledAt,
      interviewDetails: teacher.interviewDetails,
      reapplyAvailableAt: teacher.reapplyAvailableAt,
      canAppeal:
        teacher.approvalStatus === "REJECTED" &&
        isAppealOpen(teacher.reapplyAvailableAt),
    });

  } catch (error) {
    console.error(
      "Teacher onboarding status error:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to check teacher onboarding status",
      },
      {
        status: 500,
      }
    );
  }
}