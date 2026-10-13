import { NextResponse } from "next/server";
import { CognitoJwtVerifier } from "aws-jwt-verify";

import { getIdTokenFromRequest, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

/**
 * Signature-verified counterpart to `features/teacher/server/auth.ts`'s
 * `requireTeacherId()` — the Teacher-side twin of
 * `features/parent/server/verifiedAuth.ts`.
 *
 * `requireTeacherId()` only DECODES the Cognito ID token (it never
 * checks the signature), so anyone who can hand-craft a JWT with a
 * teacher's `sub` could act as that teacher. This helper validates the
 * token against Cognito's public keys (signature, `exp`, `aud`, `iss`,
 * token use) and requires the `custom:role` claim to be "teacher".
 *
 * Use it on any Teacher route where a forged session would move money
 * or create a credential: enrollment approval and certificate
 * issue/decline.
 */
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
  tokenUse: "id",
  clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
});

export async function requireVerifiedTeacherId(
  req: Request,
): Promise<{ teacherId: string } | { error: NextResponse }> {
  const token = getIdTokenFromRequest(req);

  if (!token) {
    return { error: unauthorizedResponse() };
  }

  let payload;

  try {
    payload = await verifier.verify(token);
  } catch {
    return {
      error: unauthorizedResponse("Invalid or expired session. Please login again."),
    };
  }

  if (payload["custom:role"] !== "teacher") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const teacher = await prisma.teacher.findUnique({
    where: { cognitoId: payload.sub },
    select: { id: true },
  });

  if (!teacher) {
    return {
      error: NextResponse.json({ error: "Teacher not found." }, { status: 404 }),
    };
  }

  return { teacherId: teacher.id };
}
