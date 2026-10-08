import { createSign } from "node:crypto";
import "server-only";

/**
 * Google Meet REST API client — server-only, no SDK, no Vercel-specific
 * code (plain `fetch` + `node:crypto`, so it runs on any Node host).
 *
 * A small pool of Workspace accounts ("organizers") owns the meetings.
 * We authenticate as ONE service account with domain-wide delegation
 * and impersonate whichever organizer owns the room. Only the organizer
 * can switch on auto-recording and manage members, so every call about
 * a space must be made as that space's organizer (the session meeting
 * service stores the owner on the session).
 *
 * Env (all server-side, never committed):
 *   GOOGLE_MEET_ENABLED                 "true" to turn the feature on
 *   GOOGLE_MEET_ORGANIZER_EMAIL         the FIRST (default) organizer. Rooms
 *                                       created before the pool existed
 *                                       belong to it, so never change it
 *   GOOGLE_MEET_EXTRA_ORGANIZER_EMAILS  optional, comma-separated extra
 *                                       organizers (each needs a Workspace
 *                                       license and must be covered by the
 *                                       service account's delegation)
 *   GOOGLE_MEET_SA_CLIENT_EMAIL         service account `client_email`
 *   GOOGLE_MEET_SA_PRIVATE_KEY          service account `private_key`
 *                                       (literal "\n" sequences are accepted)
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
export const MEET_V2 = "https://meet.googleapis.com/v2";
const SCOPE = "https://www.googleapis.com/auth/meetings.space.created";
export const REQUEST_TIMEOUT_MS = 10_000;
export class GoogleMeetError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "GoogleMeetError";
    this.status = status;
  }
}
export function isGoogleMeetEnabled(): boolean {
  return process.env.GOOGLE_MEET_ENABLED?.trim().toLowerCase() === "true";
}
interface MeetConfig {
  organizerEmail: string;
  clientEmail: string;
  privateKey: string;
}
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}
/**
 * Every organizer account, in priority order. The first one is the
 * default: rooms created before the pool existed have no stored owner
 * and are treated as belonging to it.
 */
export function getMeetOrganizers(): string[] {
  const primary = process.env.GOOGLE_MEET_ORGANIZER_EMAIL ?? "";
  const extras = process.env.GOOGLE_MEET_EXTRA_ORGANIZER_EMAILS ?? "";
  const seen = new Set<string>();
  const list: string[] = [];

  for (const part of `${primary},${extras}`.split(/[\s,;]+/)) {
    const email = normaliseEmail(part);

    if (email && !seen.has(email)) {
      seen.add(email);
      list.push(email);
    }
  }

  return list;
}
function readConfig(organizerEmail: string): MeetConfig {
  const organizer = normaliseEmail(organizerEmail);
  const clientEmail = process.env.GOOGLE_MEET_SA_CLIENT_EMAIL?.trim();
  const rawKey = process.env.GOOGLE_MEET_SA_PRIVATE_KEY;

  if (!organizer || !clientEmail || !rawKey?.trim()) {
    throw new GoogleMeetError(
      "Google Meet is enabled but GOOGLE_MEET_ORGANIZER_EMAIL, GOOGLE_MEET_SA_CLIENT_EMAIL or GOOGLE_MEET_SA_PRIVATE_KEY is missing.",
    );
  }

  // Env files / dashboards often store the key on one line with "\n".
  const privateKey = rawKey.replace(/^"|"$/g, "").replace(/\\n/g, "\n");

  return { organizerEmail: organizer, clientEmail, privateKey };
}
function base64Url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}
function signAssertion(config: MeetConfig, nowSeconds: number): string {
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(
    JSON.stringify({
      iss: config.clientEmail,
      // Domain-wide delegation: act as this organizer.
      sub: config.organizerEmail,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: nowSeconds,
      exp: nowSeconds + 3600,
    }),
  );
  const unsigned = `${header}.${claims}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(config.privateKey);

  return `${unsigned}.${base64Url(signature)}`;
}
/** One cached access token per organizer account. */
export const cachedTokens = new Map<string, { value: string; expiresAtMs: number }>();
export async function getAccessToken(organizerEmail: string): Promise<string> {
  const key = normaliseEmail(organizerEmail);
  const nowMs = Date.now();
  const cached = cachedTokens.get(key);

  if (cached && cached.expiresAtMs - 60_000 > nowMs) {
    return cached.value;
  }

  const config = readConfig(key);
  let assertion: string;

  try {
    assertion = signAssertion(config, Math.floor(nowMs / 1000));
  } catch {
    throw new GoogleMeetError(
      "Could not sign the Google service-account request. Check GOOGLE_MEET_SA_PRIVATE_KEY.",
    );
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !data.access_token) {
    // Names the organizer: a new account that was never authorised for
    // delegation fails here (typically `unauthorized_client`).
    throw new GoogleMeetError(
      `Google token request failed for ${key} (${res.status}): ${data.error ?? "unknown"} ${data.error_description ?? ""}`.trim(),
      res.status,
    );
  }

  cachedTokens.set(key, {
    value: data.access_token,
    expiresAtMs: nowMs + (data.expires_in ?? 3600) * 1000,
  });

  return data.access_token;
}
