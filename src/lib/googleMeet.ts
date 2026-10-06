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

async function meetRequest<T>(
  url: string,
  body?: unknown,
  method: "GET" | "POST" | "DELETE" = "POST",
): Promise<T> {
  const token = await getAccessToken();

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!res.ok) {
    // A rejected token must not be reused on the next call.
    if (res.status === 401) cachedToken = null;

    const text = (await res.text().catch(() => "")).slice(0, 300);

    throw new GoogleMeetError(`Google Meet API ${res.status}: ${text}`, res.status);
  }

  // DELETE answers with an empty body.
  return (await res.json().catch(() => ({}))) as T;
}

export interface MeetSpace {
  /** "spaces/abc123" — the id used by every other Meet API call. */
  name: string;
  /** The link people open to join. */
  meetingUri: string;
}

/**
 * Creates a Meet space owned by the organizer. Access is OPEN: anyone
 * with the link joins without knocking (parents need no Google account;
 * Meet shows its "open to anyone" notice). Moderation is on so a listed
 * co-host gets real host controls. The meeting is recorded
 * automatically to the organizer's Drive.
 */
export async function createMeetSpace(): Promise<MeetSpace> {
  const space = await meetRequest<{ name?: string; meetingUri?: string }>(`${MEET_V2}/spaces`, {
    config: {
      accessType: "OPEN",
      // Co-host roles only take effect when moderation is on; without
      // it the teacher joins as a plain participant (no host controls,
      // and auto-recording never finds anyone allowed to start it).
      moderation: "ON",
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

interface MeetMember {
  /** "spaces/abc/members/xyz" — needed to delete a member. */
  name: string;
  email?: string;
  role?: string;
}

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Network errors, timeouts, rate limits and Google 5xx are worth another try. */
function isRetryable(err: unknown): boolean {
  if (err instanceof GoogleMeetError) {
    return err.status === 429 || err.status >= 500 || err.status === 401;
  }

  return true; // fetch/abort errors
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (i === attempts - 1 || !isRetryable(err)) break;

      await sleep(400 * (i + 1));
    }
  }

  throw lastError;
}

/** Every member of a space (follows pagination). */
export async function listMeetMembers(spaceName: string): Promise<MeetMember[]> {
  const members: MeetMember[] = [];
  let pageToken = "";

  // 50 pages is far beyond any class; the cap only guards a runaway loop.
  for (let page = 0; page < 50; page++) {
    const query = new URLSearchParams({ pageSize: "100" });

    if (pageToken) query.set("pageToken", pageToken);

    const data = await meetRequest<{ members?: MeetMember[]; nextPageToken?: string }>(
      `${MEET_V2}/${spaceName}/members?${query.toString()}`,
      undefined,
      "GET",
    );

    members.push(...(data.members ?? []));

    if (!data.nextPageToken) break;

    pageToken = data.nextPageToken;
  }

  return members;
}

export interface CoHostResult {
  confirmed: boolean;
  /** Short, log-safe reason when `confirmed` is false. */
  error: string | null;
}

/**
 * Makes `email` a co-host of the space and CHECKS that it stuck.
 * Safe to call any number of times (idempotent):
 *  - already a co-host            -> confirmed, nothing written
 *  - listed with another role     -> removed and re-added as co-host
 *  - not listed                   -> added, then read back to verify
 * Transient Google errors are retried; a permanent one (for example the
 * email isn't a Google account) returns `confirmed: false` with the reason.
 * Never throws.
 */
export async function ensureMeetCoHost(spaceName: string, email: string): Promise<CoHostResult> {
  const wanted = normaliseEmail(email);
  const findMine = (members: MeetMember[]) =>
    members.find((m) => m.email && normaliseEmail(m.email) === wanted);

  try {
    let existing: MeetMember | undefined;
    let canList = true;

    try {
      existing = findMine(await withRetry(() => listMeetMembers(spaceName)));
    } catch {
      // Listing is only for verification; fall back to trusting `create`.
      canList = false;
    }

    if (existing?.role === "COHOST") return { confirmed: true, error: null };

    // The Members API has no "update", so a wrong role is replaced.
    if (existing) {
      await withRetry(() => meetRequest(`${MEET_V2}/${existing.name}`, undefined, "DELETE"));
    }

    try {
      await withRetry(() =>
        meetRequest(`${MEET_V2}/${spaceName}/members`, { email: wanted, role: "COHOST" }),
      );
    } catch (err) {
      // 409 = already a member; the read-back below decides if it is a co-host.
      if (!(err instanceof GoogleMeetError && err.status === 409)) throw err;
    }

    if (!canList) return { confirmed: true, error: null };

    // Read back (Google can lag a moment behind a write).
    for (let i = 0; i < 3; i++) {
      const mine = findMine(await withRetry(() => listMeetMembers(spaceName)));

      if (mine?.role === "COHOST") return { confirmed: true, error: null };

      await sleep(500 * (i + 1));
    }

    return { confirmed: false, error: "Added, but Google Meet did not show the teacher as co-host." };
  } catch (err) {
    return {
      confirmed: false,
      error: (err instanceof Error ? err.message : String(err)).slice(0, 300),
    };
  }
}
