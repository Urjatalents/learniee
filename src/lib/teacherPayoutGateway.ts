import "server-only";

/**
 * SIMULATED PAYOUT (used while `RAZORPAYX_ENABLED` is not "true").
 * UPDATE Oct 13, 2026: real RazorpayX payouts now exist — see
 * `src/lib/razorpayX.ts` and `features/shared/server/teacherPayout/gateway.ts`.
 * This stub is kept only as the safe default before KYC/activation.
 *
 * Original note — Teacher Payouts (Sep 9, 2026).
 *
 * Actually sending money to a teacher's bank account needs
 * RazorpayX Payouts, which is a SEPARATE product from the Razorpay
 * Payments integration already live in `src/lib/razorpay.ts`
 * (order/checkout/webhook). RazorpayX needs its own dashboard-level
 * setup — a current account + Payouts enabled + KYC — that hasn't
 * been confirmed as done (06-OPEN-DECISIONS.md #46). Per Aman: build
 * the full Verify -> Payment Queue -> Mass-pay workflow now and stub
 * the actual transfer, so the workflow is fully usable today and the
 * only thing left to do once RazorpayX is confirmed live is swap the
 * body of this one function.
 *
 * This function is deliberately the ONLY place that "money leaves
 * the platform" — `teacherPayout.service.ts` never talks to a
 * payment gateway directly, so swapping stub -> real is a one-file
 * change.
 *
 * To go live with RazorpayX later:
 *   1. `npm install razorpay` already covers it — same SDK exposes `payouts.create()`.
 *   2. Create a Razorpay `Contact` + `FundAccount` per teacher (once,
 *      cache the ids on `BankAccount` — not modeled yet, add
 *      `razorpayContactId`/`razorpayFundAccountId` columns then).
 *   3. Call `razorpayX.payouts.create({ account_number, fund_account_id,
 *      amount: amountInRupees * 100, currency: "INR", mode: "IMPS",
 *      purpose: "payout", queue_if_low_balance: true, reference_id })`.
 *   4. RazorpayX payouts are async — `status` comes back as
 *      `queued`/`processing`, not an instant `success`. That means
 *      `PayoutRecordStatus`/`TuitionLedgerEntry.payoutStatus` would need
 *      a `PROCESSING` state and a signature-verified webhook
 *      (`/api/webhooks/razorpay` already exists and already verifies
 *      signatures — add a payout event handler there) to flip it to
 *      PAID/FAILED, instead of this stub's "always succeeds
 *      immediately" behavior.
 */

export interface StubPayoutInput {
  teacherId: string;
  amountInRupees: number;
  bankAccount: {
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
  };
}

export interface StubPayoutResult {
  success: true;
  /** Obviously-fake id, prefixed so it's never mistaken for a real Razorpay payout id. */
  razorpayPayoutId: string;
}

export async function initiateStubTeacherPayout(
  input: StubPayoutInput,
): Promise<StubPayoutResult> {
  // No network call — this is the stub. See the doc-comment above
  // for what a real RazorpayX call here looks like.
  void input;

  return {
    success: true,
    razorpayPayoutId: `stub_payout_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  };
}
