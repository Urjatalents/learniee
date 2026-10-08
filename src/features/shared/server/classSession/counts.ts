import { COUNTED_SESSION_STATUSES } from "@/features/shared/utils/sessionOutcome";
import { prisma } from "@/lib/prisma";
import {
    ClassSessionStatus
} from "@prisma/client";
import "server-only";

export interface EnrollmentSessionCounts {
  ccc: number;
  mcc: number;
  tcc: number;
}
/**
 * Batched CCC/MCC/TCC for a set of enrollments at once — used by the
 * Tuition Ledger export, which previously hardcoded all three to 0
 * (see `features/accounts/server/export.service.ts`'s old
 * doc-comment: "no ClassSession model yet"). Definitions (documented
 * here since nothing else in the project spec fixes them — flagged
 * as a judgment call, same footing as the pricing formula in
 * 03-DATA-MODEL.md):
 *
 *   CCC (Current Class Completed) — `Enrollment.sessionsCompletedInCycle`,
 *     i.e. progress in the *cycle* currently running.
 *   MCC (Monthly Class Completed) — sessions completed within the
 *     current *calendar* month for that enrollment. Deliberately
 *     distinct from CCC — a cycle and a calendar month only line up
 *     if the cycle happens to start on the 1st.
 *   TCC (Total Class Completed) — all-time completed sessions for
 *     that enrollment.
 *
 * Confirm this split with Aman before treating it as settled, same
 * as the other flagged assumptions in 06-OPEN-DECISIONS.md.
 */
export async function getSessionCountsForEnrollments(
  enrollmentIds: string[],
): Promise<Map<string, EnrollmentSessionCounts>> {
  const counts = new Map<string, EnrollmentSessionCounts>();

  if (enrollmentIds.length === 0) {
    return counts;
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [cccRows, mccRows, tccRows] = await Promise.all([
    prisma.enrollment.findMany({
      where: { id: { in: enrollmentIds } },
      select: { id: true, sessionsCompletedInCycle: true },
    }),
    prisma.classSession.groupBy({
      by: ["enrollmentId"],
      where: {
        enrollmentId: { in: enrollmentIds },
        // Counted sessions (Part 1C). Legacy rows only ever have
        // COMPLETED, so their numbers are unchanged.
        status: { in: [...COUNTED_SESSION_STATUSES] as ClassSessionStatus[] },
        scheduledDate: { gte: monthStart, lt: monthEnd },
      },
      _count: { _all: true },
    }),
    prisma.classSession.groupBy({
      by: ["enrollmentId"],
      where: {
        enrollmentId: { in: enrollmentIds },
        status: { in: [...COUNTED_SESSION_STATUSES] as ClassSessionStatus[] },
      },
      _count: { _all: true },
    }),
  ]);

  for (const e of cccRows) {
    counts.set(e.id, { ccc: e.sessionsCompletedInCycle, mcc: 0, tcc: 0 });
  }
  for (const row of mccRows) {
    const existing = counts.get(row.enrollmentId);
    if (existing) existing.mcc = row._count._all;
  }
  for (const row of tccRows) {
    const existing = counts.get(row.enrollmentId);
    if (existing) existing.tcc = row._count._all;
  }

  return counts;
}
