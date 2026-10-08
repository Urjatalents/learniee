import "server-only";

/**
 * Teacher Payouts — the Payment Queue / mass-pay half (Sep 9, 2026).
 * The Verify/Admin-review half lives in `tuitionLedger.service.ts`
 * (it only needs `TuitionLedgerEntry`); this file owns everything
 * that needs `BankAccount`/`PayoutBatch`/`PayoutRecord` instead.
 *
 * The actual money movement is a STUB — see
 * `src/lib/teacherPayoutGateway.ts`'s doc-comment for why (RazorpayX
 * Payouts isn't confirmed enabled yet) and what swapping it for a
 * real call looks like.
 */

export class TeacherPayoutError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
// ---------------------------------------------------------------------------
// Bank account — Teacher self-service
// ---------------------------------------------------------------------------

export const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
