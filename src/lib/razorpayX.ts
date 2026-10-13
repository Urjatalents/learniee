import "server-only";
import crypto from "crypto";

/**
 * RazorpayX Payouts client (Oct 13, 2026) — server-only.
 *
 * RazorpayX is a separate product from Razorpay Payments
 * (`src/lib/razorpay.ts`): own account number, own API keys, own
 * webhook. Plain REST over `fetch` (no SDK dependency).
 *
 * Env vars:
 *   RAZORPAYX_ENABLED          "true" to send real money. Anything else
 *                              keeps the simulated payout (safe default).
 *   RAZORPAYX_KEY_ID           RazorpayX API key id
 *   RAZORPAYX_KEY_SECRET       RazorpayX API key secret
 *   RAZORPAYX_ACCOUNT_NUMBER   The RazorpayX account number payouts debit
 *   RAZORPAYX_PAYOUT_MODE      IMPS (default) | NEFT | RTGS | UPI
 *   RAZORPAYX_WEBHOOK_SECRET   Secret set on the RazorpayX webhook
 */

const BASE_URL = "https://api.razorpay.com/v1";
const REQUEST_TIMEOUT_MS = 20_000;

export class RazorpayXError extends Error {
  status: number | null;
  /**
   * true  = Razorpay answered with a clear 4xx rejection — nothing was created.
   * false = network error / timeout / 5xx / 429 — the request MAY have been
   *         processed, so the caller must retry with the same idempotency key
   *         instead of assuming failure.
   */
  definitive: boolean;

  constructor(message: string, status: number | null, definitive: boolean) {
    super(message);
    this.status = status;
    this.definitive = definitive;
  }
}

export function isRazorpayXEnabled(): boolean {
  return (process.env.RAZORPAYX_ENABLED ?? "").trim().toLowerCase() === "true";
}

function getEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}

function authHeader(): string {
  const token = Buffer.from(
    `${getEnv("RAZORPAYX_KEY_ID")}:${getEnv("RAZORPAYX_KEY_SECRET")}`,
  ).toString("base64");

  return `Basic ${token}`;
}

async function request<T>(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  let res: Response;

  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json",
        ...extraHeaders,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    throw new RazorpayXError(
      `RazorpayX request failed (${error instanceof Error ? error.message : "network error"}).`,
      null,
      false,
    );
  }

  let json: unknown = null;

  try {
    json = await res.json();
  } catch {
    // Non-JSON body — handled below via status.
  }

  if (!res.ok) {
    const description =
      (json as { error?: { description?: string } } | null)?.error?.description ??
      `RazorpayX returned HTTP ${res.status}.`;
    const definitive =
      res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429;

    throw new RazorpayXError(description, res.status, definitive);
  }

  return json as T;
}

// ---------------------------------------------------------------------------
// Entities (only the fields we read)
// ---------------------------------------------------------------------------

export interface RazorpayXPayoutEntity {
  id: string;
  status: string;
  reference_id?: string | null;
  utr?: string | null;
  failure_reason?: string | null;
  status_details?: { description?: string | null; reason?: string | null } | null;
}

export function describePayoutFailure(entity: RazorpayXPayoutEntity): string {
  return (
    entity.status_details?.description ||
    entity.failure_reason ||
    entity.status_details?.reason ||
    `Payout ${entity.status}.`
  );
}

// ---------------------------------------------------------------------------
// Calls
// ---------------------------------------------------------------------------

export async function createContact(input: {
  name: string;
  email: string;
  phone?: string | null;
  referenceId: string;
}): Promise<{ id: string }> {
  const digits = input.phone?.replace(/\D/g, "") ?? "";

  return request<{ id: string }>("POST", "/contacts", {
    name: input.name,
    email: input.email,
    ...(digits.length >= 8 && digits.length <= 15 ? { contact: digits } : {}),
    type: "vendor",
    reference_id: input.referenceId,
  });
}

export async function createFundAccount(input: {
  contactId: string;
  accountHolderName: string;
  ifscCode: string;
  accountNumber: string;
}): Promise<{ id: string }> {
  return request<{ id: string }>("POST", "/fund_accounts", {
    contact_id: input.contactId,
    account_type: "bank_account",
    bank_account: {
      name: input.accountHolderName,
      ifsc: input.ifscCode,
      account_number: input.accountNumber,
    },
  });
}

/** IMPS tops out at ₹5,00,000 per transfer — fall back to NEFT above that. */
function pickMode(amountInRupees: number): string {
  const configured = (process.env.RAZORPAYX_PAYOUT_MODE ?? "IMPS").trim().toUpperCase();

  if (configured === "IMPS" && amountInRupees > 500_000) {
    return "NEFT";
  }

  return configured;
}

/**
 * Creates a payout. `idempotencyKey` (we use the PayoutRecord id) makes a
 * retry after a timeout safe: Razorpay returns the original payout instead
 * of sending money twice. The header is mandatory on this API.
 */
export async function createPayout(input: {
  fundAccountId: string;
  amountInRupees: number;
  referenceId: string;
  idempotencyKey: string;
  notes?: Record<string, string>;
}): Promise<RazorpayXPayoutEntity> {
  return request<RazorpayXPayoutEntity>(
    "POST",
    "/payouts",
    {
      account_number: getEnv("RAZORPAYX_ACCOUNT_NUMBER"),
      fund_account_id: input.fundAccountId,
      amount: Math.round(input.amountInRupees * 100),
      currency: "INR",
      mode: pickMode(input.amountInRupees),
      purpose: "payout",
      queue_if_low_balance: true,
      reference_id: input.referenceId,
      narration: "Learniee tutor payout",
      notes: input.notes,
    },
    { "X-Payout-Idempotency": input.idempotencyKey },
  );
}

export async function fetchPayout(payoutId: string): Promise<RazorpayXPayoutEntity> {
  return request<RazorpayXPayoutEntity>("GET", `/payouts/${encodeURIComponent(payoutId)}`);
}

// ---------------------------------------------------------------------------
// Webhook
// ---------------------------------------------------------------------------

/** HMAC-SHA256 of the raw body keyed with `RAZORPAYX_WEBHOOK_SECRET`. */
export function verifyRazorpayXWebhookSignature(params: {
  rawBody: string;
  signature: string;
}): boolean {
  const secret = getEnv("RAZORPAYX_WEBHOOK_SECRET");
  const expected = Buffer.from(
    crypto.createHmac("sha256", secret).update(params.rawBody).digest("hex"),
    "utf8",
  );
  const received = Buffer.from(params.signature, "utf8");

  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}
