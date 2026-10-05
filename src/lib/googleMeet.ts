import "server-only";

import { createSign } from "node:crypto";

/**
 * Google Meet REST API client — server-only, no SDK, no Vercel-specific
 * code (plain `fetch` + `node:crypto`, so it runs on any Node host).
 *
 * One Workspace account (the "organizer") owns every meeting. We
 * authenticate as a service account with domain-wide delegation and
 * impersonate that organizer. Only the organizer can switch on
 * auto-recording, which is why every space is created as them.
 *
 * Env (all server-side, never committed):
 *   GOOGLE_MEET_ENABLED          "true" to turn the feature on
 *   GOOGLE_MEET_ORGANIZER_EMAIL  the Workspace user to impersonate
 *   GOOGLE_MEET_SA_CLIENT_EMAIL  service account `client_email`
 *   GOOGLE_MEET_SA_PRIVATE_KEY   service account `private_key`
 *                                (literal "\n" sequences are accepted)
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const MEET_V2 = "https://meet.googleapis.com/v2";
// `spaces.members` is only served from v2beta at the time of writing.
const MEET_V2_BETA = "https://meet.googleapis.com/v2beta";
const SCOPE = "https://www.googleapis.com/auth/meetings.space.created";
const REQUEST_TIMEOUT_MS = 10_000;

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

function readConfig(): MeetConfig {
  const organizerEmail = process.env.GOOGLE_MEET_ORGANIZER_EMAIL?.trim();
  const clientEmail = process.env.GOOGLE_MEET_SA_CLIENT_EMAIL?.trim();
  const rawKey = process.env.GOOGLE_MEET_SA_PRIVATE_KEY;

  if (!organizerEmail || !clientEmail || !rawKey?.trim()) {
    throw new GoogleMeetError(
      "Google Meet is enabled but GOOGLE_MEET_ORGANIZER_EMAIL, GOOGLE_MEET_SA_CLIENT_EMAIL or GOOGLE_MEET_SA_PRIVATE_KEY is missing.",
    );
  }

  // Env files / dashboards often store the key on one line with "\n".
  const privateKey = rawKey.replace(/^"|"$/g, "").replace(/\\n/g, "\n");

  return { organizerEmail, clientEmail, privateKey };
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
      // Domain-wide delegation: act as the organizer.
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

let cachedToken: { value: string; expiresAtMs: number } | null = null;

async function getAccessToken(): Promise<string> {
  const nowMs = Date.now();

  if (cachedToken && cachedToken.expiresAtMs - 60_000 > nowMs) {
    return cachedToken.value;
  }

  const config = readConfig();
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
    throw new GoogleMeetError(
      `Google token request failed (${res.status}): ${data.error ?? "unknown"} ${data.error_description ?? ""}`.trim(),
      res.status,
    );
  }

  cachedToken = {
    value: data.access_token,
    expiresAtMs: nowMs + (data.expires_in ?? 3600) * 1000,
  };

  return cachedToken.value;
}

async function meetRequest<T>(url: string, body: unknown): Promise<T> {
  const token = await getAccessToken();

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!res.ok) {
    // A rejected token must not be reused on the next call.
    if (res.status === 401) cachedToken = null;

    const text = (await res.text().catch(() => "")).slice(0, 300);

    throw new GoogleMeetError(`Google Meet API ${res.status}: ${text}`, res.status);
  }

  return (await res.json()) as T;
}

export interface MeetSpace {
  /** "spaces/abc123" — the id used by every other Meet API call. */
  name: string;
  /** The link people open to join. */
  meetingUri: string;
}

/**
 * Creates a Meet space owned by the organizer. Access is TRUSTED: people
 * invited as members (the teacher, as co-host) join directly, everyone
 * else must knock and be admitted by the teacher — so Meet no longer
 * shows "This call is open to anyone". The meeting is recorded
 * automatically to the organizer's Drive.
 */
export async function createMeetSpace(): Promise<MeetSpace> {
  const space = await meetRequest<{ name?: string; meetingUri?: string }>(`${MEET_V2}/spaces`, {
    config: {
      accessType: "TRUSTED",
      artifactConfig: {
        recordingConfig: { autoRecordingGeneration: "ON" },
      },
    },
  });

  if (!space.name || !space.meetingUri) {
    throw new GoogleMeetError("Google Meet returned a space without a link.");
  }

  return { name: space.name, meetingUri: space.meetingUri };
}

/**
 * Adds a person as co-host of a space. Only works if the email is a
 * Google account — callers should treat a failure as non-fatal (the
 * teacher can still join through the link as a normal participant).
 */
export async function addMeetCoHost(spaceName: string, email: string): Promise<void> {
  await meetRequest(`${MEET_V2_BETA}/${spaceName}/members`, {
    email,
    role: "COHOST",
  });
}
