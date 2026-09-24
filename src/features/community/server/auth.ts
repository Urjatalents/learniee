import { NextResponse } from "next/server";
import { CommunitySenderRole, TeacherApprovalStatus } from "@prisma/client";

import { requireCommunityMember } from "@/lib/verifyAdmin";
import { prisma } from "@/lib/prisma";
import type { CommunityActor } from "@/features/community/server/community.service";

const ROLE_BY_CLAIM: Record<string, CommunitySenderRole> = {
  teacher: CommunitySenderRole.TEACHER,
  admin: CommunitySenderRole.ADMIN,
  accounts: CommunitySenderRole.ACCOUNTS,
  hr: CommunitySenderRole.HR,
  it: CommunitySenderRole.IT,
};

function fail(message: string, status: number) {
  return { error: NextResponse.json({ error: message }, { status }) };
}

function joinName(first?: string | null, last?: string | null) {
  return [first, last].filter(Boolean).join(" ").trim();
}

function claim(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/**
 * Resolves who is calling a Community route. Signature-verified
 * (aws-jwt-verify), unlike the decode-only Teacher/Parent helpers
 * (06 #21). Parents get 401. A Teacher must be APPROVED — enforced
 * here on the server, not just in the UI (06 #68).
 */
export async function requireCommunityActor(): Promise<
  { actor: CommunityActor } | { error: NextResponse }
> {
  const payload = await requireCommunityMember();

  if (!payload) {
    return fail("Unauthorized. Please login again.", 401);
  }

  const role = ROLE_BY_CLAIM[String(payload["custom:role"])];
  const sub = payload.sub;
  const tokenName = joinName(claim(payload.given_name), claim(payload.family_name));
  const tokenEmail = claim(payload.email);

  if (role === CommunitySenderRole.TEACHER) {
    const teacher = await prisma.teacher.findUnique({
      where: { cognitoId: sub },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        visibleName: true,
        approvalStatus: true,
      },
    });

    if (!teacher) {
      return fail("Teacher not found.", 404);
    }
    if (teacher.approvalStatus !== TeacherApprovalStatus.APPROVED) {
      return fail("The community opens once your teacher application is approved.", 403);
    }

    return {
      actor: {
        role,
        id: teacher.id,
        name:
          teacher.visibleName?.trim() ||
          joinName(teacher.firstName, teacher.lastName) ||
          "Teacher",
      },
    };
  }

  if (role === CommunitySenderRole.ADMIN) {
    const admin = await prisma.admin.findUnique({
      where: { cognitoId: sub },
      select: { id: true, firstName: true, lastName: true },
    });

    return {
      actor: {
        role,
        id: admin?.id ?? sub,
        name: (admin && joinName(admin.firstName, admin.lastName)) || tokenName || "Admin",
      },
    };
  }

  // Accounts / HR / IT — a StaffAccount row normally exists; fall back
  // to the token so a script-provisioned login isn't locked out.
  const staff = await prisma.staffAccount.findUnique({
    where: { cognitoSub: sub },
    select: { id: true, firstName: true, lastName: true },
  });

  return {
    actor: {
      role,
      id: staff?.id ?? sub,
      name:
        (staff && joinName(staff.firstName, staff.lastName)) ||
        tokenName ||
        tokenEmail ||
        "Staff",
    },
  };
}
