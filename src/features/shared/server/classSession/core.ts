import {
    Enrollment,
    EnrollmentStatus
} from "@prisma/client";
import "server-only";

/**
 * ClassSession — the actual record of a class happening (or being
 * scheduled to happen), tied to a real date/time. Resolves the
 * single biggest MVP gap flagged in 07-LESSONS-LEARNED.md /
 * 03-DATA-MODEL.md: before this, "sessions completed" was a blind
 * Teacher-only counter click (the old `cycleProgress.service.ts`,
 * now a thin compatibility wrapper around this file) with no record
 * of which date it corresponded to, and the Tuition Ledger's
 * CCC/MCC/TCC columns were hardcoded to 0
 * (`features/accounts/server/export.service.ts`) because there was
 * nothing to count.
 *
 * Rows are generated from an Enrollment's recurring
 * `scheduleDays`/`scheduleTime` (same convention the old
 * `scheduleOccurrences.service.ts` used to compute on the fly — that
 * file now reads from this table instead), so a session's
 * date/time/status is a real, stored fact that survives a later
 * schedule change: editing `scheduleDays`/`scheduleTime` only
 * regenerates *future*, still-SCHEDULED rows
 * (`regenerateFutureSessions`), never rewrites COMPLETED/CANCELLED
 * history.
 *
 * Generation is lazy/idempotent (`ensureSessionsGenerated`) rather
 * than cron-driven — there's no job runner in this project yet
 * (06-OPEN-DECISIONS.md has no ReminderJob/cron entity either), so
 * it's called opportunistically from the calendar routes, the
 * per-enrollment sessions list, and the mark-complete flow. The
 * `[enrollmentId, scheduledDate]` unique constraint makes repeated
 * generation calls safe (`skipDuplicates`).
 *
 * CYCLE MODEL (Part 1A, Sep 2026): everything above describes the
 * LEGACY path (`Enrollment.isLegacy = true`). Non-legacy enrollments
 * never use lazy generation — `createCycleSessions()` creates every
 * session of a cycle, exactly once, inside the transaction that
 * activates the enrollment, and `generateSessionsForEnrollment` /
 * `regenerateFutureSessions` are no-ops for them so nothing extra can
 * ever appear later.
 */

export class ClassSessionError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
/**
 * How far ahead (from today) to keep sessions generated. Bounds the
 * work `ensureSessionsGenerated` does on each call, since it's
 * re-run opportunistically rather than on a fixed schedule.
 */
export const GENERATION_HORIZON_DAYS = 45;
export const GENERATION_STATUSES: EnrollmentStatus[] = [
  EnrollmentStatus.ACTIVE,
  EnrollmentStatus.LAPSED,
];
export function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
export function addDays(d: Date, days: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}
/** [cycleStartDate, cycleStartDate + noOfMonths) — the full contract window. */
export function cycleWindow(enrollment: { cycleStartDate: Date; noOfMonths: number }) {
  const start = startOfDay(new Date(enrollment.cycleStartDate));
  const end = new Date(start);
  end.setMonth(end.getMonth() + enrollment.noOfMonths);
  return { start, end };
}
export type EnrollmentForGeneration = Pick<
  Enrollment,
  | "id"
  | "teacherId"
  | "studentId"
  | "parentId"
  | "cycleStartDate"
  | "noOfMonths"
  | "scheduleDays"
  | "scheduleTime"
  | "isLegacy"
>;
