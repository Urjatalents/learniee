import { NextResponse } from "next/server";
import { CognitoJwtVerifier } from "aws-jwt-verify";

import {
  getIdTokenFromRequest,
  unauthorizedResponse,
  type CognitoTokenPayload,
} from "@/lib/api-auth";

/**
 * Signature-verified drop-in for `requireAdminAuth(req)` in
 * `lib/api-auth.ts`.
 *
 * `requireAdminAuth` only DECODES the Cognito ID token, so a
 * hand-crafted JWT with `custom:role: "admin"` would pass it. This
 * helper validates the token against Cognito's public keys
 * (signature, `exp`, `aud`, `iss`, token use) and requires the
 * `custom:role` claim to be "admin".
 *
 * Same call shape as the old helper, except it's async:
 *
 *   const auth = await requireVerifiedAdminAuth(req);
 *   if ("error" in auth) return auth.error;
 *   const { payload } = auth;   // sub / email / given_name / family_name
 *
 * (Routes that read the cookie via `next/headers` use `requireAdmin()`
 * from `lib/verifyAdmin.ts` instead — same verification, different
 * way of getting the token.)
 */
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
  tokenUse: "id",
  clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
});

export async function requireVerifiedAdminAuth(req: Request): Promise<
  | { token: string; payload: CognitoTokenPayload }
  | { error: ReturnType<typeof NextResponse.json> }
> {
  const token = getIdTokenFromRequest(req);

  if (!token) {
    return { error: unauthorizedResponse() };
  }

  let verified;

  try {
    verified = await verifier.verify(token);
  } catch {
    return {
      error: unauthorizedResponse("Invalid or expired session. Please login again."),
    };
  }

  if (verified["custom:role"] !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return {
    token,
    payload: {
      sub: verified.sub,
      email: verified.email as string | undefined,
      given_name: verified.given_name as string | undefined,
      family_name: verified.family_name as string | undefined,
      "custom:role": "admin",
    },
  };
}
