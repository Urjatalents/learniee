import { SESSION_POLICY } from "@/lib/platformConfig";
import { dateToCalendarDate, platformWallClockToUtc } from "@/lib/platformTime";

/**
 * Phase 1.6: a leave that starts less than `emergencyLeaveHours`
 * after it was submitted is allowed but flagged to Admin. Pure and
 * derived from the two stored dates, so nothing extra is saved and
 * the flag can be computed for old rows too.
 *
 * `startDate` is the saved leave start (UTC midnight of a platform
 * calendar date); the leave is taken to begin at 00:00 platform time
 * on that date.
 */
export function isEmergencyLeave(startDate: Date, submittedAt: Date): boolean {
  const leaveBegins = platformWallClockToUtc(dateToCalendarDate(startDate), "00:00");

  return (
    leaveBegins.getTime() - submittedAt.getTime() <
    SESSION_POLICY.emergencyLeaveHours * 3_600_000
  );
}
