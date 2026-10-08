import "server-only";

/**
 * The Tuition Ledger + Monthly Payout Verification, as real persisted
 * state instead of a report computed on the fly.
 *
 * `createLedgerEntryForCompletedCycle()` is called from
 * cycleProgress.service.ts inside the same transaction that flips
 * cyclePayoutStatus to READY_FOR_PAYOUT — one TuitionLedgerEntry row
 * per completed cycle, snapshotting the 17-field record with a real
 * CCC (sessionsCompleted) instead of the old export-only view's
 * placeholder 0.
 *
 * Everything else here is the Accounts-side "Monthly Payout
 * Verification" workflow (08-PROJECT-KNOWLEDGE-BASE.md — Accounts'
 * 1-day Approve/Reject window per teacher payout): list pending
 * entries, approve, reject. There's no cron/job runner in this
 * project (07-LESSONS-LEARNED.md), so an overdue PENDING_VERIFICATION
 * row is reconciled lazily — flipped to EXPIRED the next time anyone
 * lists the ledger — rather than via a background job. EXPIRED is
 * just a flag for Admin/Accounts to re-decide; it never silently
 * pays or silently withholds money.
 *
 * UPDATED Sep 9, 2026 — Teacher Payouts. Accounts' old binary
 * Approve/Reject is now Proceed/Hold/Reject, and "Approve" no longer
 * means "paid" — it means "queued for the Payment tab." See
 * `LedgerPayoutStatus`'s doc-comment in schema.prisma for the full
 * state machine, and `teacherPayout.service.ts` for the
 * Payment-Queue/mass-pay half of this that lives in a separate file
 * (it needs `BankAccount`/`PayoutBatch`/`PayoutRecord`, which have
 * nothing to do with the Verify-stage logic below).
 */

export const TEACHER_SHARE = 0.7;
 // 06-OPEN-DECISIONS.md #1: teacher keeps 70%
export const PLATFORM_SHARE = 0.3;
 // Profits = 30% of Monthly_rate
export const VERIFICATION_WINDOW_MS = 24 * 60 * 60 * 1000;
 // 1-day Approve/Reject window

export class TuitionLedgerError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
