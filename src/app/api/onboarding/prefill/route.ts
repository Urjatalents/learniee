import { NextRequest, NextResponse } from "next/server";
import { requireCognitoAuth, type CognitoTokenPayload } from "@/lib/api-auth";

interface PrefillTokenPayload extends CognitoTokenPayload {
  phone_number?: string;
}

/**
 * Read-only convenience endpoint for the onboarding form: hands back
 * whatever we already know about the parent from their Cognito signup
 * (name, phone) so step1 can pre-fill instead of asking for it twice.
 * No DB read — everything here already lives in the ID token claims.
 * Purely additive UX; the form still lets the user edit anything filled
 * in from this.
 */
export async function GET(req: NextRequest) {
  const auth = requireCognitoAuth<PrefillTokenPayload>(req);

  if ("error" in auth) {
    return auth.error;
  }

  const { payload } = auth;
  const visibleName = [payload.given_name, payload.family_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return NextResponse.json({
    visibleName,
    whatsappNumber: payload.phone_number ?? "",
  });
}
