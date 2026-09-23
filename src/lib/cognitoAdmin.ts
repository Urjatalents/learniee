import {
  CognitoIdentityProviderClient,
  AdminDeleteUserCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminUpdateUserAttributesCommand,
  UsernameExistsException,
} from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;

export async function adminDeleteCognitoUser(username: string) {
  await client.send(
    new AdminDeleteUserCommand({ UserPoolId: USER_POOL_ID, Username: username })
  );
}

export interface CreateStaffCognitoUserInput {
  email: string;
  firstName: string;
  lastName: string;
  phone: string; // E.164, e.g. +91XXXXXXXXXX
  role: "hr" | "accounts" | "it";
  tempPassword: string;
}

/**
 * Creates a Cognito user for an internal staff account (HR/Accounts/IT).
 * MessageAction is suppressed — we've already OTP-verified the email and
 * phone ourselves before calling this, and we send the temp password via
 * our own email (see src/lib/ses.ts) rather than Cognito's default
 * invitation email. email_verified/phone_number_verified are asserted
 * true here because the OTP step already proved ownership.
 *
 * Leaving TemporaryPassword set (rather than a permanent password) puts
 * the user in FORCE_CHANGE_PASSWORD status, so their first
 * authenticateUser() call gets a NEW_PASSWORD_REQUIRED challenge instead
 * of a normal session — see useLogin.ts.
 */
export async function adminCreateStaffCognitoUser(
  input: CreateStaffCognitoUserInput,
): Promise<{ cognitoSub: string }> {
  try {
    const result = await client.send(
      new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: input.email,
        MessageAction: "SUPPRESS",
        TemporaryPassword: input.tempPassword,
        UserAttributes: [
          { Name: "email", Value: input.email },
          { Name: "email_verified", Value: "true" },
          { Name: "phone_number", Value: input.phone },
          { Name: "phone_number_verified", Value: "true" },
          { Name: "given_name", Value: input.firstName },
          { Name: "family_name", Value: input.lastName },
          { Name: "custom:role", Value: input.role },
        ],
      }),
    );

    const sub = result.User?.Attributes?.find((a) => a.Name === "sub")?.Value;
    if (!sub) {
      throw new Error("Cognito did not return a sub for the new user.");
    }

    return { cognitoSub: sub };
  } catch (err) {
    if (err instanceof UsernameExistsException) {
      throw new Error("A Cognito user with this email already exists.");
    }
    throw err;
  }
}


export interface SetAccountPasswordInput {
  /** Cognito Username — we pass the same cognitoSub/cognitoId already
   * used for AdminDeleteUserCommand above, not the email. */
  cognitoUsername: string;
  newPassword: string;
  /** true = permanent password, done. false = temporary password —
   * Cognito puts the account in FORCE_CHANGE_PASSWORD status, so the
   * next login gets the NEW_PASSWORD_REQUIRED challenge already
   * handled generically in useLogin.ts (same flow AdminCreateUser's
   * TemporaryPassword triggers for new staff logins above). */
  permanent: boolean;
}

/**
 * Account Access (Sep 23, 2026) — lets Admin/IT reset the login
 * password for any account without ever reading or storing the old
 * one (Cognito never exposes it). See accountAccess.service.ts for
 * the role-scoping and audit trail around this.
 */
export async function adminSetAccountPassword({
  cognitoUsername,
  newPassword,
  permanent,
}: SetAccountPasswordInput): Promise<void> {
  await client.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: USER_POOL_ID,
      Username: cognitoUsername,
      Password: newPassword,
      Permanent: permanent,
    }),
  );
}

export interface UpdateAccountContactInput {
  cognitoUsername: string;
  /** New email, if changing it. */
  email?: string;
  /** New phone in E.164, if changing it. */
  phone?: string;
}

/**
 * Updates the email and/or phone number Cognito has on file for an
 * account. Both are marked pre-verified (same reasoning as
 * adminCreateStaffCognitoUser above): an Admin/IT staff member is
 * making this change directly, not the account holder self-serving
 * through a verification-code flow. Caller is responsible for also
 * updating the matching Prisma row (email/phone are unique columns
 * on Teacher/ParentProfile/StaffAccount) — see
 * accountAccess.service.ts.
 */
export async function adminUpdateAccountContact({
  cognitoUsername,
  email,
  phone,
}: UpdateAccountContactInput): Promise<void> {
  const UserAttributes: { Name: string; Value: string }[] = [];
  if (email) {
    UserAttributes.push({ Name: "email", Value: email });
    UserAttributes.push({ Name: "email_verified", Value: "true" });
  }
  if (phone) {
    UserAttributes.push({ Name: "phone_number", Value: phone });
    UserAttributes.push({ Name: "phone_number_verified", Value: "true" });
  }
  if (UserAttributes.length === 0) return;

  await client.send(
    new AdminUpdateUserAttributesCommand({
      UserPoolId: USER_POOL_ID,
      Username: cognitoUsername,
      UserAttributes,
    }),
  );
}
