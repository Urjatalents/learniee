import { LedgerPayoutStatus, Prisma } from "@prisma/client";
import "server-only";
import { PLATFORM_SHARE, TEACHER_SHARE, VERIFICATION_WINDOW_MS } from './base';
import { round2 } from '@/lib/money';

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
 * Part 2A: an Admin decision changed how many sessions of an
 * already-CLOSED cycle count, so its ledger row (written at close
 * from the count at that moment) may be out of date. Called inside
 * the reconcile transaction (`sessionReview.service.ts`).
 *
 *   no row yet, something counts   -> written now             CREATED
 *   row not acted on yet           -> corrected in place       UPDATED
 *     (PENDING_VERIFICATION / EXPIRED)
 *   row not acted on, nothing counts -> sent to Admin's payout
 *     review as REJECTED (never a zero-rupee payout)            REJECTED
 *   Accounts / Admin already moved it -> left alone, the caller
 *     tells Admin to adjust it by hand                          LOCKED
 *   count unchanged                                             UNCHANGED
 *
 * Amounts use the same rule as `createLedgerEntryForClosedCycle`.
 */
export async function reconcileLedgerEntryForClosedCycle(
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
): Promise<"CREATED" | "UPDATED" | "REJECTED" | "LOCKED" | "UNCHANGED"> {
  const { enrollment, cycle, countedSessions } = input;

  const entry = await tx.tuitionLedgerEntry.findUnique({
    where: {
      enrollmentId_cycleNumber: {
        enrollmentId: enrollment.id,
        cycleNumber: cycle.cycleNumber,
      },
    },
  });

  if (!entry) {
    const created = await createLedgerEntryForClosedCycle(tx, input);

    return created ? "CREATED" : "UNCHANGED";
  }

  if (entry.sessionsCompleted === countedSessions) {
    return "UNCHANGED";
  }

  const editable: LedgerPayoutStatus[] = [
    LedgerPayoutStatus.PENDING_VERIFICATION,
    LedgerPayoutStatus.EXPIRED,
  ];

  if (!editable.includes(entry.payoutStatus)) {
    return "LOCKED";
  }

  if (countedSessions <= 0) {
    await tx.tuitionLedgerEntry.update({
      where: { id: entry.id },
      data: {
        sessionsCompleted: 0,
        monthlyRate: 0,
        monthlyTeacherPay: 0,
        profits: 0,
        payoutStatus: LedgerPayoutStatus.REJECTED,
        rejectionReason:
          "No sessions count after an Admin reviewed this cycle's classes — nothing to pay.",
      },
    });

    return "REJECTED";
  }

  const earned = round2(Number(cycle.ratePerSession) * countedSessions);

  await tx.tuitionLedgerEntry.update({
    where: { id: entry.id },
    data: {
      sessionsCompleted: countedSessions,
      monthlyRate: earned,
      monthlyTeacherPay: round2(earned * TEACHER_SHARE),
      profits: round2(earned * PLATFORM_SHARE),
    },
  });

  return "UPDATED";
}
