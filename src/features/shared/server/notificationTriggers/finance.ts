import {
    createNotification,
    notifyAllAdmins
} from "@/features/shared/server/notification.service";
import { prisma } from "@/lib/prisma";
import "server-only";
import { R, T, displayName, safe } from './shared';

// ---------------------------------------------------------------------------
// Wallet
// ---------------------------------------------------------------------------

export function notifyWalletCredited(parentId: string, amount: number, reason: string) {
  return safe("wallet credited", async () => {
    await createNotification({
      recipientId: parentId,
      recipientRole: R.PARENT,
      type: T.WALLET_CREDITED,
      title: "Wallet credited",
      message: `₹${amount.toLocaleString("en-IN")} was added to your wallet — ${reason}`,
      link: "/parent/wallet",
    });
  });
}
// ---------------------------------------------------------------------------
// Teacher Payouts (Sep 9, 2026) — Verify -> Payment Queue -> Mass-pay.
// See LedgerPayoutStatus's doc-comment in schema.prisma for the full
// state machine these correspond to.
// ---------------------------------------------------------------------------

/** Accounts held or rejected a payout — notifies the Teacher, and every Admin (it now needs their review). */
export function notifyPayoutHeldOrRejected(
  teacherId: string,
  action: "HOLD" | "REJECT",
  reason: string | undefined,
) {
  return safe("payout held or rejected", async () => {
    const held = action === "HOLD";

    await createNotification({
      recipientId: teacherId,
      recipientRole: R.TEACHER,
      type: held ? T.PAYOUT_ON_HOLD : T.PAYOUT_REJECTED,
      title: held ? "A payout was put on hold" : "A payout was rejected",
      message: held
        ? `Accounts put one of your cycle payouts on hold${reason ? ` — ${reason}` : ""}. It's been sent to Admin for review.`
        : `Accounts rejected one of your cycle payouts${reason ? ` — ${reason}` : ""}. It's been sent to Admin for review.`,
      link: "/teacher/rate-calculator",
    });

    await notifyAllAdmins({
      type: held ? T.PAYOUT_ON_HOLD : T.PAYOUT_REJECTED,
      title: held ? "A teacher payout is on hold" : "A teacher payout was rejected",
      message: `Accounts ${held ? "held" : "rejected"} a cycle payout${reason ? ` (${reason})` : ""} — needs your review.`,
      link: "/admin/payout-review",
    });
  });
}
// ---------------------------------------------------------------------------
// Bank Account Approval (Sep 10, 2026) — Teacher submits/edits ->
// every Admin gets told (same "any Admin can act" pattern as leave
// requests) -> Admin's decision notifies the Teacher back.
// ---------------------------------------------------------------------------

export function notifyBankAccountSubmitted(teacherId: string) {
  return safe("bank account submitted", async () => {
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { firstName: true, lastName: true, visibleName: true },
    });
    if (!teacher) return;

    await notifyAllAdmins({
      type: T.BANK_ACCOUNT_SUBMITTED,
      title: "Bank details submitted for review",
      message: `${displayName(teacher)} submitted payout bank details for approval.`,
      link: "/admin/bank-accounts",
    });
  });
}
export function notifyBankAccountReviewed(
  teacherId: string,
  approved: boolean,
  rejectionReason?: string | null,
) {
  return safe("bank account reviewed", async () => {
    await createNotification({
      recipientId: teacherId,
      recipientRole: R.TEACHER,
      type: approved ? T.BANK_ACCOUNT_APPROVED : T.BANK_ACCOUNT_REJECTED,
      title: approved ? "Bank details approved" : "Bank details rejected",
      message: approved
        ? "Your payout bank details were approved by Admin. You're now eligible for payouts."
        : `Your payout bank details were rejected by Admin${rejectionReason ? ` — ${rejectionReason}` : ""}. Please review and resubmit.`,
      link: "/teacher/bank-account",
    });
  });
}
/** Accounts mass-paid one or more teachers. */
export function notifyPayoutPaid(teacherId: string, amount: number, cycleCount: number) {
  return safe("payout paid", async () => {
    await createNotification({
      recipientId: teacherId,
      recipientRole: R.TEACHER,
      type: T.PAYOUT_PAID,
      title: "Payout sent",
      message: `₹${amount.toLocaleString("en-IN")} for ${cycleCount} completed cycle${cycleCount === 1 ? "" : "s"} has been paid out.`,
      link: "/teacher/rate-calculator",
    });
  });
}
