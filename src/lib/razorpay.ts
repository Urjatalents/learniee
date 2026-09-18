import "server-only";
import crypto from "crypto";
import Razorpay from "razorpay";

/**
 * Server-only Razorpay helpers. Never import this from a Client
 * Component — the key secrets must never reach the browser.
 * A Razorpay key *id* itself is not secret (it's the public half of
 * the pair), so `getRazorpayKeyId()` is safe to return from an API
 * route's JSON response so the client never needs its own copy of
 * the env var.
 *
 * Currency note: Learniee only ever creates orders in INR — every
 * price in the product (Course.price, the flat ₹100 demo fee) is an
 * INR amount, and that's what we ask Razorpay to charge.
 *
 * International-surcharge note (UPDATED Sep 8, 2026 — supersedes
 * the old no-markup decision that used to live in this comment):
 * international parents are now charged an explicit surcharge on
 * top of the base INR price, computed server-side via
 * `src/lib/internationalPayments.ts` and folded into the order
 * amount before it ever reaches Razorpay. Their card network/issuing
 * bank may still apply its own separate forex fee on top of that —
 * we have no visibility into that and don't try to account for it.
 * Non-Indian cards still won't work at all unless "International
 * Payments" is enabled in the Razorpay Dashboard (Account &
 * Settings -> Configuration) — that's a dashboard toggle + KYC
 * step, not code, same as before.
 *
 * TEST / LIVE MODE (added Sep 18, 2026)
 * --------------------------------------
 * This project now keeps two full sets of Razorpay credentials side
 * by side and picks between them with a single env var,
 * `RAZORPAY_MODE` (`"test"` or `"live"`). Every route/service in the
 * app goes through `getRazorpayClient()` / `getRazorpayKeyId()` /
 * `verifyCheckoutSignature()` below rather than touching
 * `process.env.RAZORPAY_*` directly, so switching `RAZORPAY_MODE` in
 * the Vercel dashboard (or `.env.local`) is the *only* thing you
 * need to touch to flip between test and live payments — no code
 * change, no redeploy of anything else.
 *
 * Env vars, per mode:
 *   RAZORPAY_MODE                 "test" | "live" — defaults to
 *                                  "test" if unset, so a missing/typo'd
 *                                  value can never accidentally take
 *                                  real money.
 *   RAZORPAY_TEST_KEY_ID           Test-mode key id   (starts rzp_test_)
 *   RAZORPAY_TEST_KEY_SECRET       Test-mode key secret
 *   RAZORPAY_TEST_WEBHOOK_SECRET   Test-mode webhook secret (optional —
 *                                  only needed if you configure a
 *                                  Test Mode webhook in the Dashboard)
 *   RAZORPAY_LIVE_KEY_ID           Live-mode key id   (starts rzp_live_)
 *   RAZORPAY_LIVE_KEY_SECRET       Live-mode key secret
 *   RAZORPAY_LIVE_WEBHOOK_SECRET   Live-mode webhook secret (optional,
 *                                  same caveat as above)
 *
 * The webhook endpoint (`/api/webhooks/razorpay`) is mode-agnostic
 * on purpose: Razorpay's Test Mode and Live Mode dashboards each let
 * you register a webhook against the *same* URL with their own,
 * independent secret. `verifyWebhookSignature()` accepts a payload
 * signed with either configured secret, so you can point both a Test
 * Mode and a Live Mode webhook at this one endpoint simultaneously
 * without the app needing to know in advance which one fired.
 *
 * Removing test mode later: once you're done testing, delete the
 * `RAZORPAY_TEST_*` env vars, set `RAZORPAY_MODE=live` (or delete
 * that var too, but see the default note above — explicit is
 * safer), and optionally delete the "TEST / LIVE MODE" block in this
 * file plus the mode-selection helpers below, replacing
 * `getRazorpayKeyId()` calls with a direct
 * `getEnv("RAZORPAY_LIVE_KEY_ID")` if you want the file back to its
 * original single-mode shape. Nothing outside this file needs to
 * change either way — that's the point of routing everything through
 * these functions.
 */

export type RazorpayMode = "test" | "live";

function getEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}

/**
 * Reads `RAZORPAY_MODE`. Defaults to `"test"` when unset so a blank
 * or missing env var can never silently start charging real cards.
 * Throws on any value other than "test"/"live" for the same reason —
 * fail loud rather than guess.
 */
export function getRazorpayMode(): RazorpayMode {
  const raw = (process.env.RAZORPAY_MODE ?? "test").trim().toLowerCase();

  if (raw !== "test" && raw !== "live") {
    throw new Error(
      `Invalid RAZORPAY_MODE "${raw}" — must be "test" or "live".`,
    );
  }

  return raw;
}

function getModeEnv(mode: RazorpayMode, suffix: string): string {
  const prefix = mode === "live" ? "RAZORPAY_LIVE_" : "RAZORPAY_TEST_";
  return getEnv(`${prefix}${suffix}`);
}

/** The public key id for whichever mode `RAZORPAY_MODE` currently
 * selects. Safe to return to the client (it's not a secret) — used
 * by every `/order` route to hand Checkout the right key. */
export function getRazorpayKeyId(): string {
  return getModeEnv(getRazorpayMode(), "KEY_ID");
}

function getRazorpayKeySecret(): string {
  return getModeEnv(getRazorpayMode(), "KEY_SECRET");
}

const clientCache = new Map<RazorpayMode, Razorpay>();

/** Lazily-constructed, mode-keyed singleton so a missing env var
 * only throws when a payment route is actually hit, not at
 * build/import time, and so a `RAZORPAY_MODE` flip mid-process
 * (e.g. between two test runs) always gets the right client instead
 * of a stale cached one from the other mode. */
export function getRazorpayClient(): Razorpay {
  const mode = getRazorpayMode();
  let client = clientCache.get(mode);

  if (!client) {
    client = new Razorpay({
      key_id: getModeEnv(mode, "KEY_ID"),
      key_secret: getModeEnv(mode, "KEY_SECRET"),
    });
    clientCache.set(mode, client);
  }

  return client;
}

/** Razorpay takes amounts in the smallest currency unit — paise for
 * INR. All Learniee amounts are `Decimal(10,2)` rupees; convert at
 * the boundary, right before calling Razorpay, never earlier. */
export function rupeesToPaise(amountInRupees: number): number {
  return Math.round(amountInRupees * 100);
}

function safeHmacEquals(secret: string, payload: string, signature: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");

  const expectedBuf = Buffer.from(expected, "utf8");
  const signatureBuf = Buffer.from(signature, "utf8");

  // timingSafeEqual throws on length mismatch instead of returning
  // false — guard that so a malformed signature is just "invalid"
  // instead of a 500.
  if (expectedBuf.length !== signatureBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuf, signatureBuf);
}

/**
 * Verifies the `razorpay_signature` returned to the browser after
 * Razorpay Checkout succeeds (HMAC-SHA256 of `order_id|payment_id`,
 * keyed with the account's key secret — the standard client-side
 * checkout verification per Razorpay's docs). This proves the
 * order/payment pair wasn't tampered with in transit, but does NOT
 * by itself prove the payment was actually captured — callers
 * should still fetch the order/payment from Razorpay's API before
 * trusting the amount (done in the enrollment/demo/wallet verify
 * routes).
 *
 * Keyed with whichever mode's key secret `RAZORPAY_MODE` currently
 * selects — the order this signature belongs to was created with
 * the same mode's client, so this always matches as long as the env
 * var isn't flipped mid-transaction.
 */
export function verifyCheckoutSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = getRazorpayKeySecret();
  return safeHmacEquals(secret, `${params.orderId}|${params.paymentId}`, params.signature);
}

/**
 * Verifies a Razorpay webhook payload's `X-Razorpay-Signature`
 * header against the raw request body. Keyed with the webhook
 * secret configured in the Razorpay Dashboard (Settings ->
 * Webhooks) — NOT the same value as a key secret.
 *
 * Checks against *both* `RAZORPAY_LIVE_WEBHOOK_SECRET` and
 * `RAZORPAY_TEST_WEBHOOK_SECRET` (whichever of the two is actually
 * set), independent of the current `RAZORPAY_MODE` — Razorpay's
 * Test Mode and Live Mode dashboards can each point a webhook at
 * this same URL with their own secret, and either may fire
 * regardless of which mode this deployment's `/order` routes are
 * currently using. At least one of the two webhook-secret env vars
 * must be set, or this throws.
 */
export function verifyWebhookSignature(params: { rawBody: string; signature: string }): boolean {
  const secrets = [
    process.env.RAZORPAY_LIVE_WEBHOOK_SECRET,
    process.env.RAZORPAY_TEST_WEBHOOK_SECRET,
  ].filter((value): value is string => Boolean(value));

  if (secrets.length === 0) {
    throw new Error(
      "Missing required env var: set RAZORPAY_LIVE_WEBHOOK_SECRET and/or RAZORPAY_TEST_WEBHOOK_SECRET.",
    );
  }

  return secrets.some((secret) => safeHmacEquals(secret, params.rawBody, params.signature));
}
