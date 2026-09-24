import { CognitoJwtVerifier } from "aws-jwt-verify";
import { cookies } from "next/headers";

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
  tokenUse: "id",
  clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
});

export async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("idToken")?.value;
  if (!token) return null;

  try {
    const payload = await verifier.verify(token);
    if (payload["custom:role"] !== "admin") return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Same as requireAdmin(), but also allows the "accounts" staff role.
 * Used by routes/pages that expose financial data (Accounts export,
 * Accounts dashboard) to both Admin and Accounts logins, and no one else.
 * Signature-verified (not decode-only) since this is money-adjacent data —
 * see 06-OPEN-DECISIONS.md #21.
 */
export async function requireAdminOrAccounts() {
  const cookieStore = await cookies();
  const token = cookieStore.get("idToken")?.value;
  if (!token) return null;

  try {
    const payload = await verifier.verify(token);
    const role = payload["custom:role"];
    if (role !== "admin" && role !== "accounts") return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Signature-verified check for the "hr" staff role, used by the HR
 * dashboard page. Doesn't also allow "admin" — unlike
 * requireAdminOrAccounts, there's no Admin-facing HR data yet, so this
 * is just the HR login's own page.
 */
export async function requireHr() {
  const cookieStore = await cookies();
  const token = cookieStore.get("idToken")?.value;
  if (!token) return null;

  try {
    const payload = await verifier.verify(token);
    if (payload["custom:role"] !== "hr") return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Signature-verified check for the "it" staff role, used by the IT
 * dashboard page (added Sep 23, 2026 alongside the IT staff role).
 */
export async function requireIt() {
  const cookieStore = await cookies();
  const token = cookieStore.get("idToken")?.value;
  if (!token) return null;

  try {
    const payload = await verifier.verify(token);
    if (payload["custom:role"] !== "it") return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Signature-verified check for anyone allowed into the internal
 * Community room: Teacher, Admin and the staff logins (Accounts, HR,
 * IT). Parents are excluded on purpose. Returns the verified token
 * payload; the caller resolves the actual person and, for a Teacher,
 * checks approval (see features/community/server/auth.ts).
 */
export async function requireCommunityMember() {
  const cookieStore = await cookies();
  const token = cookieStore.get("idToken")?.value;
  if (!token) return null;

  try {
    const payload = await verifier.verify(token);
    const role = payload["custom:role"];
    if (
      role !== "teacher" &&
      role !== "admin" &&
      role !== "accounts" &&
      role !== "hr" &&
      role !== "it"
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
