import "server-only";

import { Prisma, LedgerPayoutStatus, PayoutAdminDecision } from "@prisma/client";

import { prisma } from "@/lib/prisma";

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

const TEACHER_SHARE = 0.7; // 06-OPEN-DECISIONS.md #1: teacher keeps 70%
const PLATFORM_SHARE = 0.3; // Profits = 30% of Monthly_rate
const VERIFICATION_WINDOW_MS = 24 * 60 * 60 * 1000; // 1-day Approve/Reject window

export class TuitionLedgerError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Creates the ledger row for a just-completed cycle. Meant to be
 * called with the *same* `tx` client the Enrollment update runs in
 * (see cycleProgress.service.ts), so the cycle-progress update and
 * the ledger entry are written atomically — either both happen or
 * neither does.
 *
 * Idempotent against retries: `cycleNumber` + the
 * `@@unique([enrollmentId, cycleNumber])` constraint mean a duplicate
 * call for the same completed cycle is a no-op rather than a second
 * row or a thrown error.
 */
export async function createLedgerEntryForCompletedCycle(
  tx: Prisma.TransactionClient,
  enrollment: {
    id: string;
    parentId: string;
    teacherId: string;
    studentId: string;
    courseId: string;
    cyclesCompleted: number; // already incremented by the caller
    sessionsPerMonth: number;
    noOfMonths: number;
    ratePerSession: Prisma.Decimal;
    monthlyRate: Prisma.Decimal;
    totalAmount: Prisma.Decimal;
    dueDate: Date;
  },
) {
  const rate = Number(enrollment.ratePerSession);
  const monthlyRate = Number(enrollment.monthlyRate);
  const now = new Date();

  try {
    return await tx.tuitionLedgerEntry.create({
      data: {
        enrollmentId: enrollment.id,
        cycleNumber: enrollment.cyclesCompleted,
        parentId: enrollment.parentId,
        teacherId: enrollment.teacherId,
        studentId: enrollment.studentId,
        courseId: enrollment.courseId,
        transactionDate: now,
        noOfMonths: enrollment.noOfMonths,
        rate: enrollment.ratePerSession,
        monthlyRate: enrollment.monthlyRate,
        totalAmount: enrollment.totalAmount,
        sessionsCompleted: enrollment.sessionsPerMonth,
        dueDate: enrollment.dueDate,
        teacherRate: round2(rate * TEACHER_SHARE),
        monthlyTeacherPay: round2(monthlyRate * TEACHER_SHARE),
        profits: round2(monthlyRate * PLATFORM_SHARE),
        payoutStatus: LedgerPayoutStatus.PENDING_VERIFICATION,
        verificationDeadline: new Date(now.getTime() + VERIFICATION_WINDOW_MS),
      },
    });
  } catch (error) {
    // P2002 = unique constraint violation on [enrollmentId, cycleNumber] —
    // this cycle's ledger row already exists (a retried mark-session
    // call). Treat as success rather than surfacing a 500.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return tx.tuitionLedgerEntry.findUniqueOrThrow({
        where: {
          enrollmentId_cycleNumber: {
            enrollmentId: enrollment.id,
            cycleNumber: enrollment.cyclesCompleted,
          },
        },
      });
    }
    throw error;
  }
}

/**
 * Cycle model (Part 1C): the ledger row for a cycle that just CLOSED,
 * based on the sessions that COUNTED — not on the number paid for.
 * Called inside the same transaction that marks the cycle CLOSED
 * (`cycleClose.service.ts`), which only ever happens once per cycle.
 *
 * Amounts (same 70/30 split as `createLedgerEntryForCompletedCycle`):
 *   monthlyRate       = rate per session x counted sessions (what was earned)
 *   totalAmount       = the cycle price the parent paid
 *   monthlyTeacherPay = 70% of monthlyRate
 *   profits           = 30% of monthlyRate
 * Forfeited sessions therefore produce no teacher pay. (The unearned
 * part of the price is not in `profits` — flagged in 06 #60.)
 *
 * `createMany({ skipDuplicates })` rather than `create` + catching
 * P2002: a caught unique violation would leave the surrounding
 * Postgres transaction aborted. Returns whether a row was written.
 */
export async function createLedgerEntryForClosedCycle(
  tx: Prisma.TransactionClient,
  input: {
    enrollment: {
      id: string;
      parentId: string;
      teacherId: string;
      studentId: string;
      courseId: string;
      dueDate: Date;
    };
    cycle: { cycleNumber: number; ratePerSession: Prisma.Decimal; price: Prisma.Decimal };
    countedSessions: number;
  },
): Promise<boolean> {
  const { enrollment, cycle, countedSessions } = input;

  if (countedSessions <= 0) {
    return false;
  }

  const rate = Number(cycle.ratePerSession);
  const earned = round2(rate * countedSessions);
  const now = new Date();

  const result = await tx.tuitionLedgerEntry.createMany({
    data: [
      {
        enrollmentId: enrollment.id,
        cycleNumber: cycle.cycleNumber,
        parentId: enrollment.parentId,
        teacherId: enrollment.teacherId,
        studentId: enrollment.studentId,
        courseId: enrollment.courseId,
        transactionDate: now,
        noOfMonths: 1,
        rate,
        monthlyRate: earned,
        totalAmount: Number(cycle.price),
        sessionsCompleted: countedSessions,
        dueDate: enrollment.dueDate,
        teacherRate: round2(rate * TEACHER_SHARE),
        monthlyTeacherPay: round2(earned * TEACHER_SHARE),
        profits: round2(earned * PLATFORM_SHARE),
        payoutStatus: LedgerPayoutStatus.PENDING_VERIFICATION,
        verificationDeadline: new Date(now.getTime() + VERIFICATION_WINDOW_MS),
      },
    ],
    skipDuplicates: true,
  });

  return result.count > 0;
}

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

const ledgerEntryInclude = {
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

function toLedgerEntryView(
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
