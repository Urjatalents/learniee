import { prisma } from "@/lib/prisma";
import { LedgerPayoutStatus, Prisma } from "@prisma/client";
import "server-only";

/**
 * Lazily reconciles overdue PENDING_VERIFICATION rows to EXPIRED.
 * Called at the top of every read path below — same "reconcile on
 * read" pattern the Razorpay webhook uses, since there's no
 * cron/job runner in this project yet.
 */
async function expireOverdueEntries() {
  await prisma.tuitionLedgerEntry.updateMany({
    where: {
      payoutStatus: LedgerPayoutStatus.PENDING_VERIFICATION,
      verificationDeadline: { lt: new Date() },
    },
    data: { payoutStatus: LedgerPayoutStatus.EXPIRED },
  });
}
export const ledgerEntryInclude = {
  enrollment: {
    include: {
      student: { select: { firstName: true, visibleName: true } },
      parent: { select: { firstName: true, lastName: true } },
      teacher: { select: { firstName: true, lastName: true, visibleName: true } },
      course: { select: { courseTitle: true, subject: true } },
    },
  },
} as const;
function displayName(first: string, last?: string | null, visible?: string | null) {
  if (visible && visible.trim()) return visible;
  return [first, last].filter(Boolean).join(" ").trim();
}
export function toLedgerEntryView(
  row: Prisma.TuitionLedgerEntryGetPayload<{ include: typeof ledgerEntryInclude }>,
) {
  const { enrollment } = row;
  return {
    id: row.id,
    enrollmentId: row.enrollmentId,
    cycleNumber: row.cycleNumber,
    transactionDate: row.transactionDate,
    teacherId: enrollment.teacherId,
    parentName: displayName(enrollment.parent.firstName, enrollment.parent.lastName),
    childName: displayName(enrollment.student.firstName, undefined, enrollment.student.visibleName),
    teacherName: displayName(
      enrollment.teacher.firstName,
      enrollment.teacher.lastName,
      enrollment.teacher.visibleName,
    ),
    subject: enrollment.subject ?? enrollment.course.subject ?? "",
    noOfMonths: row.noOfMonths,
    rate: Number(row.rate),
    monthlyRate: Number(row.monthlyRate),
    totalAmount: Number(row.totalAmount),
    sessionsCompleted: row.sessionsCompleted, // CCC — real value for this cycle
    dueDate: row.dueDate,
    teacherRate: Number(row.teacherRate),
    monthlyTeacherPay: Number(row.monthlyTeacherPay),
    profits: Number(row.profits),
    payoutStatus: row.payoutStatus,
    verificationDeadline: row.verificationDeadline,
    verifiedByStaffSub: row.verifiedByStaffSub,
    verifiedAt: row.verifiedAt,
    rejectionReason: row.rejectionReason,
    holdReason: row.holdReason,
    adminReviewedByStaffSub: row.adminReviewedByStaffSub,
    adminReviewedAt: row.adminReviewedAt,
    adminDecision: row.adminDecision,
    paidAt: row.paidAt,
    isOverdue:
      row.payoutStatus === LedgerPayoutStatus.PENDING_VERIFICATION &&
      row.verificationDeadline < new Date(),
    /** Awaiting Admin's Release/Reopen/Confirm-Reject action — drives the Admin queue. */
    awaitingAdminReview:
      (row.payoutStatus === LedgerPayoutStatus.ON_HOLD ||
        row.payoutStatus === LedgerPayoutStatus.REJECTED) &&
      !row.adminReviewedAt,
  };
}
export type TuitionLedgerEntryView = ReturnType<typeof toLedgerEntryView>;
/** Full persisted ledger — one real row per completed cycle. */
export async function listLedgerEntries(): Promise<TuitionLedgerEntryView[]> {
  await expireOverdueEntries();

  const rows = await prisma.tuitionLedgerEntry.findMany({
    include: ledgerEntryInclude,
    orderBy: { transactionDate: "desc" },
  });

  return rows.map(toLedgerEntryView);
}
/** Just the rows Accounts still needs to Verify (Proceed/Hold/Reject) — the Verify tab. */
export async function listPendingPayoutVerifications(): Promise<TuitionLedgerEntryView[]> {
  await expireOverdueEntries();

  const rows = await prisma.tuitionLedgerEntry.findMany({
    where: {
      payoutStatus: {
        in: [LedgerPayoutStatus.PENDING_VERIFICATION, LedgerPayoutStatus.EXPIRED],
      },
    },
    include: ledgerEntryInclude,
    orderBy: { verificationDeadline: "asc" },
  });

  return rows.map(toLedgerEntryView);
}
/** The rows Admin still needs to review — ON_HOLD/REJECTED, not yet reviewed. Admin's payout-review queue. */
export async function listPendingAdminPayoutReview(): Promise<TuitionLedgerEntryView[]> {
  const rows = await prisma.tuitionLedgerEntry.findMany({
    where: {
      payoutStatus: { in: [LedgerPayoutStatus.ON_HOLD, LedgerPayoutStatus.REJECTED] },
      adminReviewedAt: null,
    },
    include: ledgerEntryInclude,
    orderBy: { updatedAt: "asc" },
  });

  return rows.map(toLedgerEntryView);
}
/**
 * A single Teacher's own ledger history — every cycle across every
 * one of their Enrollments, newest first. Powers the Teacher-facing
 * Earnings screen (previously the one Ledger-adjacent gap with no
 * Teacher-side view — see 01-PROJECT-STATUS.md §3 / §7). Read-only:
 * a Teacher never acts on their own entries here, same as the rest
 * of this file — only Accounts (Verify) and Admin (Release/Reopen/
 * Confirm Reject) can change payoutStatus.
 */
export async function listLedgerEntriesForTeacher(teacherId: string): Promise<TuitionLedgerEntryView[]> {
  await expireOverdueEntries();

  const rows = await prisma.tuitionLedgerEntry.findMany({
    where: { teacherId },
    include: ledgerEntryInclude,
    orderBy: { transactionDate: "desc" },
  });

  return rows.map(toLedgerEntryView);
}
