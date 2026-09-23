import "server-only";

import { prisma } from "@/lib/prisma";
import { StaffRole } from "@prisma/client";
import { ActivityAction, ActivityActorRole } from "@prisma/client";
import { NotificationRecipientRole, NotificationType } from "@prisma/client";
import { adminSetAccountPassword, adminUpdateAccountContact } from "@/lib/cognitoAdmin";
import { logActivity } from "./activityLog.service";
import { createNotification } from "./notification.service";

/**
 * Account Access (Sep 23, 2026) — the "password manager" for Admin
 * and IT: reset a login's password, or change the email/phone
 * Cognito has on file, for any account in the platform.
 *
 * Scoping (confirmed by Aman, Sep 23, 2026): Admin can manage every
 * role (Parent, Teacher, Accounts, HR, IT, other Admins). IT is
 * restricted to Parent and Teacher only — enforced in
 * updateAccountAccess() below, not just in the UI, since the two API
 * routes (admin/IT) both funnel through this one function.
 *
 * No plaintext password is ever read or stored anywhere — Cognito
 * doesn't expose the old one, and this only ever calls
 * AdminSetUserPassword to set a new one (see cognitoAdmin.ts).
 */

export type ManagedAccountRole = "parent" | "teacher" | "accounts" | "hr" | "it" | "admin";

export interface ManagedAccountSummary {
  id: string;
  role: ManagedAccountRole;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
}

export type AccountAccessScope = "all" | "teacher-parent";

const STAFF_ROLE_TO_MANAGED: Record<StaffRole, ManagedAccountRole> = {
  [StaffRole.ACCOUNTS]: "accounts",
  [StaffRole.HR]: "hr",
  [StaffRole.IT]: "it",
};

const MANAGED_TO_STAFF_ROLE: Partial<Record<ManagedAccountRole, StaffRole>> = {
  accounts: StaffRole.ACCOUNTS,
  hr: StaffRole.HR,
  it: StaffRole.IT,
};

export class AccountAccessError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Lists every account a given scope is allowed to see/manage. */
export async function listManagedAccounts(
  scope: AccountAccessScope,
): Promise<ManagedAccountSummary[]> {
  const [parents, teachers] = await Promise.all([
    prisma.parentProfile.findMany({
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    }),
    prisma.teacher.findMany({
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    }),
  ]);

  const accounts: ManagedAccountSummary[] = [
    ...parents.map((p) => ({ ...p, role: "parent" as const })),
    ...teachers.map((t) => ({ ...t, role: "teacher" as const })),
  ];

  if (scope === "teacher-parent") return accounts;

  const [staff, admins] = await Promise.all([
    prisma.staffAccount.findMany({
      select: { id: true, role: true, firstName: true, lastName: true, email: true, phone: true },
    }),
    prisma.admin.findMany({
      select: { id: true, firstName: true, lastName: true, email: true },
    }),
  ]);

  for (const s of staff) {
    accounts.push({
      id: s.id,
      role: STAFF_ROLE_TO_MANAGED[s.role],
      firstName: s.firstName,
      lastName: s.lastName,
      email: s.email,
      phone: s.phone,
    });
  }
  for (const a of admins) {
    accounts.push({
      id: a.id,
      role: "admin",
      firstName: a.firstName,
      lastName: a.lastName,
      email: a.email,
      phone: null, // Admin has no phone column
    });
  }

  return accounts;
}

interface FoundAccount {
  id: string;
  cognitoUsername: string;
}

async function findAccountByRoleAndEmail(
  role: ManagedAccountRole,
  email: string,
): Promise<FoundAccount | null> {
  if (role === "parent") {
    const p = await prisma.parentProfile.findUnique({ where: { email } });
    return p ? { id: p.id, cognitoUsername: p.cognitoSub } : null;
  }
  if (role === "teacher") {
    const t = await prisma.teacher.findUnique({ where: { email } });
    return t ? { id: t.id, cognitoUsername: t.cognitoId } : null;
  }
  if (role === "admin") {
    const a = await prisma.admin.findUnique({ where: { email } });
    return a ? { id: a.id, cognitoUsername: a.cognitoId } : null;
  }
  const staffRole = MANAGED_TO_STAFF_ROLE[role];
  if (!staffRole) return null;
  const s = await prisma.staffAccount.findFirst({ where: { email, role: staffRole } });
  return s ? { id: s.id, cognitoUsername: s.cognitoSub } : null;
}

async function updateAccountContactInDb(
  role: ManagedAccountRole,
  id: string,
  newEmail?: string,
  newPhone?: string,
): Promise<void> {
  const data: { email?: string; phone?: string } = {};
  if (newEmail) data.email = newEmail;
  if (newPhone) data.phone = newPhone;
  if (Object.keys(data).length === 0) return;

  if (role === "parent") {
    await prisma.parentProfile.update({ where: { id }, data });
    return;
  }
  if (role === "teacher") {
    await prisma.teacher.update({ where: { id }, data });
    return;
  }
  if (role === "admin") {
    if (newPhone) {
      throw new AccountAccessError("Admin accounts have no phone number field to update.");
    }
    if (newEmail) await prisma.admin.update({ where: { id }, data: { email: newEmail } });
    return;
  }
  // accounts / hr / it — all StaffAccount rows
  await prisma.staffAccount.update({ where: { id }, data });
}

export interface AccountAccessActor {
  actorId: string;
  actorName: string | null;
  actorEmail: string | null;
}

export interface UpdateAccountAccessInput {
  scope: AccountAccessScope;
  actorRole: "admin" | "it";
  actor: AccountAccessActor;
  targetRole: ManagedAccountRole;
  targetEmail: string;
  newPassword?: string;
  /** Required (true/false) whenever newPassword is set. */
  passwordPermanent?: boolean;
  newEmail?: string;
  newPhone?: string;
}

export interface UpdateAccountAccessResult {
  passwordChanged: boolean;
  contactChanged: boolean;
}

const TEACHER_PARENT_ROLES = new Set<ManagedAccountRole>(["parent", "teacher"]);

/**
 * The single choke point both the Admin and IT account-access API
 * routes call through, so the "IT can only touch Teacher/Parent"
 * rule is enforced once here rather than trusted to each route.
 */
export async function updateAccountAccess(
  input: UpdateAccountAccessInput,
): Promise<UpdateAccountAccessResult> {
  const { scope, targetRole, targetEmail } = input;

  if (scope === "teacher-parent" && !TEACHER_PARENT_ROLES.has(targetRole)) {
    throw new AccountAccessError("IT can only manage Teacher and Parent accounts.", 403);
  }
  if (!input.newPassword && !input.newEmail && !input.newPhone) {
    throw new AccountAccessError("Nothing to update — set a password, email or phone.");
  }
  if (input.newPassword) {
    if (input.newPassword.length < 8) {
      throw new AccountAccessError("New password must be at least 8 characters.");
    }
    if (typeof input.passwordPermanent !== "boolean") {
      throw new AccountAccessError("passwordPermanent (true/false) is required with a new password.");
    }
  }

  const account = await findAccountByRoleAndEmail(targetRole, targetEmail);
  if (!account) {
    throw new AccountAccessError("Account not found.", 404);
  }

  if (input.newEmail && input.newEmail !== targetEmail) {
    const clash = await findAccountByRoleAndEmail(targetRole, input.newEmail);
    if (clash) {
      throw new AccountAccessError("Another account of this type already uses that email.");
    }
  }

  if (input.newPassword) {
    await adminSetAccountPassword({
      cognitoUsername: account.cognitoUsername,
      newPassword: input.newPassword,
      permanent: input.passwordPermanent!,
    });
  }

  if (input.newEmail || input.newPhone) {
    await adminUpdateAccountContact({
      cognitoUsername: account.cognitoUsername,
      email: input.newEmail,
      phone: input.newPhone,
    });
    // DB is updated only after the Cognito call above succeeds, so a
    // Cognito failure never leaves the DB and Cognito disagreeing on
    // the account's email/phone.
    await updateAccountContactInDb(targetRole, account.id, input.newEmail, input.newPhone);
  }

  await logActivity({
    action: input.newPassword
      ? ActivityAction.ACCOUNT_PASSWORD_RESET
      : ActivityAction.ACCOUNT_CONTACT_UPDATED,
    actorRole: input.actorRole === "it" ? ActivityActorRole.IT : ActivityActorRole.ADMIN,
    actorId: input.actor.actorId,
    actorName: input.actor.actorName,
    actorEmail: input.actor.actorEmail,
    description: input.newPassword
      ? `Password reset for ${targetRole} ${targetEmail} (${input.passwordPermanent ? "permanent" : "temporary — reset required on next login"}).`
      : `Contact info updated for ${targetRole} ${targetEmail}${input.newEmail ? ` → email ${input.newEmail}` : ""}${input.newPhone ? ", phone updated" : ""}.`,
    metadata: {
      targetRole,
      targetEmail,
      newEmail: input.newEmail ?? null,
      phoneChanged: Boolean(input.newPhone),
      passwordReset: Boolean(input.newPassword),
      passwordPermanent: input.passwordPermanent ?? null,
    },
  });

  if (targetRole === "parent" || targetRole === "teacher") {
    try {
      await createNotification({
        recipientId: account.id,
        recipientRole:
          targetRole === "parent" ? NotificationRecipientRole.PARENT : NotificationRecipientRole.TEACHER,
        type: NotificationType.ACCOUNT_CREDENTIALS_UPDATED,
        title: "Account security update",
        message: input.newPassword
          ? "Your account password was reset by Learniee support. If this wasn't you, contact us immediately."
          : "Your account's email or phone number on file was updated by Learniee support.",
      });
    } catch {
      // Best-effort, same convention as every other notification
      // trigger in the app — never block the real action on this.
    }
  }

  return {
    passwordChanged: Boolean(input.newPassword),
    contactChanged: Boolean(input.newEmail || input.newPhone),
  };
}
