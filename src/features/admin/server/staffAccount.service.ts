import { prisma } from "@/lib/prisma";
import { adminCreateStaffCognitoUser, adminDeleteCognitoUser } from "@/lib/cognitoAdmin";
import { generateTempPassword } from "@/lib/otp";
import { sendTempPasswordEmail } from "@/lib/ses";
import type { StaffRole } from "@prisma/client";

export interface CreateStaffAccountInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string; // E.164
  role: StaffRole;
  createdById: string;
}

export async function listStaffAccounts() {
  return prisma.staffAccount.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function createStaffAccount(input: CreateStaffAccountInput) {
  const existing = await prisma.staffAccount.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new Error("A staff account with this email already exists.");
  }

  const tempPassword = generateTempPassword();

  const cognitoRole: "hr" | "accounts" | "it" =
    input.role === "HR" ? "hr" : input.role === "IT" ? "it" : "accounts";

  const { cognitoSub } = await adminCreateStaffCognitoUser({
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    role: cognitoRole,
    tempPassword,
  });

  try {
    const account = await prisma.staffAccount.create({
      data: {
        cognitoSub,
        role: input.role,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        createdById: input.createdById,
      },
    });

    // Best-effort — if the email fails to send, the account still exists
    // and the admin has the temp password from the API response to relay
    // manually, so don't roll back Cognito/DB over a mail delivery hiccup.
    try {
      await sendTempPasswordEmail(input.email, input.firstName, tempPassword);
    } catch (mailErr) {
      console.error("Failed to email temp password:", mailErr);
    }

    return { account, tempPassword };
  } catch (dbErr) {
    // DB write failed after Cognito succeeded — clean up so we don't leave
    // an orphaned Cognito user with no directory entry.
    await adminDeleteCognitoUser(cognitoSub).catch((cleanupErr) =>
      console.error("Failed to roll back orphaned Cognito user:", cleanupErr),
    );
    throw dbErr;
  }
}

export async function deleteStaffAccount(id: string) {
  const account = await prisma.staffAccount.findUnique({ where: { id } });
  if (!account) {
    throw new Error("Staff account not found.");
  }

  await adminDeleteCognitoUser(account.cognitoSub);
  await prisma.staffAccount.delete({ where: { id } });
}
