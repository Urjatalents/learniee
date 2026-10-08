import { prisma } from "@/lib/prisma";
import { LedgerPayoutStatus, PayoutAdminDecision } from "@prisma/client";
import "server-only";
import { TuitionLedgerError } from './base';
import { TuitionLedgerEntryView, ledgerEntryInclude, toLedgerEntryView } from './views';

async function findVerifiableEntry(entryId: string) {
  const entry = await prisma.tuitionLedgerEntry.findUnique({ where: { id: entryId } });

  if (!entry) {
    throw new TuitionLedgerError("Ledger entry not found.", 404);
  }

  const verifiable: LedgerPayoutStatus[] = [
    LedgerPayoutStatus.PENDING_VERIFICATION,
    LedgerPayoutStatus.EXPIRED,
  ];

  if (!verifiable.includes(entry.payoutStatus)) {
    throw new TuitionLedgerError(
      "This payout has already moved past Verification — check the Payment Queue or Admin Review tab.",
      409,
    );
  }

  return entry;
}
/**
 * Accounts "Proceed" — moves a cycle straight to the Payment Queue,
 * skipping Admin entirely (same as the old "Approve," just renamed
 * to make clear it isn't a payment yet). Allowed even from EXPIRED —
 * a missed 24h window is a flag to notice, not a hard lock.
 */
export async function proceedLedgerPayout(entryId: string, staffSub: string) {
  await findVerifiableEntry(entryId);

  return prisma.tuitionLedgerEntry.update({
    where: { id: entryId },
    data: {
      payoutStatus: LedgerPayoutStatus.QUEUED_FOR_PAYMENT,
      verifiedByStaffSub: staffSub,
      verifiedAt: new Date(),
      rejectionReason: null,
      holdReason: null,
    },
    include: ledgerEntryInclude,
  }).then(toLedgerEntryView);
}
/** Accounts "Hold" — pauses the cycle and routes it to Admin for review. Not a payment decision either way. */
export async function holdLedgerPayout(entryId: string, staffSub: string, reason?: string) {
  await findVerifiableEntry(entryId);

  return prisma.tuitionLedgerEntry.update({
    where: { id: entryId },
    data: {
      payoutStatus: LedgerPayoutStatus.ON_HOLD,
      verifiedByStaffSub: staffSub,
      verifiedAt: new Date(),
      holdReason: reason ?? null,
      adminReviewedAt: null,
      adminReviewedByStaffSub: null,
      adminDecision: null,
    },
    include: ledgerEntryInclude,
  }).then(toLedgerEntryView);
}
/**
 * Accounts "Reject" — NOT terminal by itself anymore (06-OPEN-DECISIONS.md
 * #46): routes to Admin for review/confirmation, same as Hold. Admin
 * can still overturn it (Release) or send it back to Accounts (Reopen).
 */
export async function rejectLedgerPayout(entryId: string, staffSub: string, reason?: string) {
  await findVerifiableEntry(entryId);

  return prisma.tuitionLedgerEntry.update({
    where: { id: entryId },
    data: {
      payoutStatus: LedgerPayoutStatus.REJECTED,
      verifiedByStaffSub: staffSub,
      verifiedAt: new Date(),
      rejectionReason: reason ?? null,
      adminReviewedAt: null,
      adminReviewedByStaffSub: null,
      adminDecision: null,
    },
    include: ledgerEntryInclude,
  }).then(toLedgerEntryView);
}
async function findAdminReviewableEntry(entryId: string) {
  const entry = await prisma.tuitionLedgerEntry.findUnique({ where: { id: entryId } });

  if (!entry) {
    throw new TuitionLedgerError("Ledger entry not found.", 404);
  }

  const reviewable: LedgerPayoutStatus[] = [
    LedgerPayoutStatus.ON_HOLD,
    LedgerPayoutStatus.REJECTED,
  ];

  if (!reviewable.includes(entry.payoutStatus) || entry.adminReviewedAt) {
    throw new TuitionLedgerError(
      "This payout isn't currently awaiting Admin review.",
      409,
    );
  }

  return entry;
}
const VERIFICATION_WINDOW_MS_REOPEN = 24 * 60 * 60 * 1000;
/** Admin "Release" — overrides Accounts' hold/reject and sends the cycle straight to the Payment Queue. */
export async function adminReleaseLedgerPayout(entryId: string, adminSub: string) {
  await findAdminReviewableEntry(entryId);

  return prisma.tuitionLedgerEntry.update({
    where: { id: entryId },
    data: {
      payoutStatus: LedgerPayoutStatus.QUEUED_FOR_PAYMENT,
      adminReviewedByStaffSub: adminSub,
      adminReviewedAt: new Date(),
      adminDecision: PayoutAdminDecision.RELEASED,
    },
    include: ledgerEntryInclude,
  }).then(toLedgerEntryView);
}
/** Admin "Reopen" — sends the cycle back to Accounts' Verify tab with a fresh 24h window. */
export async function adminReopenLedgerPayout(entryId: string, adminSub: string) {
  await findAdminReviewableEntry(entryId);

  return prisma.tuitionLedgerEntry.update({
    where: { id: entryId },
    data: {
      payoutStatus: LedgerPayoutStatus.PENDING_VERIFICATION,
      verificationDeadline: new Date(Date.now() + VERIFICATION_WINDOW_MS_REOPEN),
      holdReason: null,
      rejectionReason: null,
      adminReviewedByStaffSub: adminSub,
      adminReviewedAt: new Date(),
      adminDecision: PayoutAdminDecision.REOPENED,
    },
    include: ledgerEntryInclude,
  }).then(toLedgerEntryView);
}
/** Admin "Confirm Reject" — the only genuinely terminal rejection in this workflow. */
export async function adminConfirmRejectLedgerPayout(entryId: string, adminSub: string) {
  await findAdminReviewableEntry(entryId);

  return prisma.tuitionLedgerEntry.update({
    where: { id: entryId },
    data: {
      payoutStatus: LedgerPayoutStatus.REJECTED,
      adminReviewedByStaffSub: adminSub,
      adminReviewedAt: new Date(),
      adminDecision: PayoutAdminDecision.CONFIRMED_REJECTED,
    },
    include: ledgerEntryInclude,
  }).then(toLedgerEntryView);
}
/** Summary cards for the Accounts dashboard. */
export async function getLedgerSummary(rows: TuitionLedgerEntryView[]) {
  return {
    totalCyclesLedgered: rows.length,
    pendingVerificationCount: rows.filter((r) => r.payoutStatus === "PENDING_VERIFICATION").length,
    overdueCount: rows.filter((r) => r.isOverdue).length,
    awaitingAdminReviewCount: rows.filter((r) => r.awaitingAdminReview).length,
    queuedForPaymentCount: rows.filter((r) => r.payoutStatus === "QUEUED_FOR_PAYMENT").length,
    // Legacy 'APPROVED' rows are backfilled to QUEUED_FOR_PAYMENT by the
    // migration, so this only ever needs to check the one status now.
    totalApprovedPayout: rows
      .filter((r) => r.payoutStatus === "QUEUED_FOR_PAYMENT" || r.payoutStatus === "PAID")
      .reduce((s, r) => s + r.monthlyTeacherPay, 0),
    totalPlatformProfit: rows
      .filter((r) => r.payoutStatus === "QUEUED_FOR_PAYMENT" || r.payoutStatus === "PAID")
      .reduce((s, r) => s + r.profits, 0),
    totalPaidOut: rows
      .filter((r) => r.payoutStatus === "PAID")
      .reduce((s, r) => s + r.monthlyTeacherPay, 0),
  };
}
