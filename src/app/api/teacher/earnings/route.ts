import { NextResponse } from "next/server";

import { requireTeacherId } from "@/features/teacher/server/auth";
import { listLedgerEntriesForTeacher } from "@/features/shared/server/tuitionLedger.service";
import {
  listPayoutRecordsForTeacher,
  getBankAccountForTeacher,
} from "@/features/shared/server/teacherPayout.service";

/**
 * GET — the logged-in Teacher's own Earnings view (Teacher Payouts
 * follow-up — the gap flagged in 01-PROJECT-STATUS.md §3/§7 and
 * 04-BUILD-PLAN-TIMELINE.md: Ledger money already existed on the
 * Accounts/Parent-Wallet side, with no Teacher-facing screen
 * surfacing it). Combines:
 *   - every TuitionLedgerEntry across all this teacher's
 *     Enrollments, whatever Verify-stage status it's currently in
 *   - every PayoutRecord from Accounts' mass-pay batches this
 *     teacher was part of (paid or skipped)
 *   - their own BankAccount's approval status, so the page can
 *     explain why a payout might be stuck
 *
 * Entirely read-only — nothing here can move a payoutStatus or
 * trigger a payout; that stays in tuitionLedger.service.ts (Accounts
 * Verify / Admin review) and teacherPayout.service.ts's mass-pay.
 */
export async function GET(req: Request) {
  const teacher = await requireTeacherId(req);

  if ("error" in teacher) {
    return teacher.error;
  }

  try {
    const [ledgerEntries, payoutRecords, bankAccount] = await Promise.all([
      listLedgerEntriesForTeacher(teacher.teacherId),
      listPayoutRecordsForTeacher(teacher.teacherId),
      getBankAccountForTeacher(teacher.teacherId),
    ]);

    return NextResponse.json({
      ledgerEntries,
      payoutRecords,
      bankAccountStatus: bankAccount?.status ?? "NONE",
    });
  } catch (error) {
    console.error("Teacher earnings GET error:", error);
    return NextResponse.json({ error: "Failed to load earnings." }, { status: 500 });
  }
}
