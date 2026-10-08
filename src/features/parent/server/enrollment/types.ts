import {
    type PlanType
} from "@/features/shared/utils/cyclePlan";

/**
 * CYCLE MODEL (Part 1A, Sep 2026) — every new enrollment is one
 * monthly cycle: start date to the same date next month minus one
 * day. The parent picks weekdays, a time and a start date; the
 * session count is however many of those weekdays fall in the cycle
 * (minimum `SESSION_POLICY.minSessionsPerCycle`), and the price is
 * session rate x session count. See `cyclePlan.ts`.
 *
 * LEGACY MODEL — the constants below and `priceLegacyEnrollment()`
 * are the pre-cycle rule (parent typed sessions/month + months).
 * They're kept only so an order created just before this change
 * deployed can still be verified/reconciled (see `CYCLE_MODEL_TAG`);
 * every enrollment created that way is stored `isLegacy = true` and
 * behaves exactly as before.
 *
 * Old cycle rule (updated Aug 31, 2026, per direct clarification —
 * supersedes 06-OPEN-DECISIONS.md #25's old fixed 4/8/12/24/30
 * set): minimum 4 sessions/month, any integer above that, capped at
 * 1 session/day for the longest possible month (31).
 */
export const MIN_SESSIONS_PER_MONTH = 4;
export const MAX_SESSIONS_PER_MONTH = 31;
export const MAX_NO_OF_MONTHS = 12;
// 0=Sunday..6=Saturday (JS Date.getDay() convention).
export const SCHEDULE_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
export class EnrollmentError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
/**
 * Stored in the Razorpay order's `notes.model` for orders created
 * under the cycle model. An order without it was created before the
 * cycle model shipped and is priced/created the legacy way, so a
 * checkout that was already in flight at deploy time never ends up
 * as captured money with no enrollment.
 */
export const CYCLE_MODEL_TAG = "CYCLE_V1";
type PricingModel = "CYCLE_V1" | "LEGACY";
export interface CreateEnrollmentInput {
  studentId: string;
  teacherId: string;
  courseId: string;
  subject?: string | null;
  /** Legacy only — ignored under the cycle model (the count comes from the schedule). */
  sessionsPerMonth?: number;
  /** Legacy only — ignored under the cycle model (a cycle is always one month). */
  noOfMonths?: number;
  /**
   * Cycle start date as "YYYY-MM-DD" (platform timezone). Defaults
   * to today if omitted. Cannot be in the past when the order is
   * created.
   */
  cycleStartDate?: string;
  /** MONTHLY (default) = one month planned and paid up front; WEEKLY = a 7-day cycle the parent renews each week. */
  planType?: PlanType;
  /** Weekly recurring class days — 0=Sunday..6=Saturday, at least one required. */
  scheduleDays: number[];
  /** Weekly recurring class time, 24-hour "HH:mm". */
  scheduleTime: string;
}
export interface PricedEnrollment {
  studentId: string;
  subject: string | null;
  sessionsPerMonth: number;
  noOfMonths: number;
  ratePerSession: number;
  monthlyRate: number;
  /** Course-computed total, unchanged by the international surcharge — see 03-DATA-MODEL.md's pricing formula. */
  totalAmount: number;
  /** Whether the international surcharge applies — see src/lib/internationalPayments.ts. */
  isInternationalPayment: boolean;
  /** Extra amount on top of totalAmount for international parents. Zero otherwise. */
  internationalSurchargeAmount: number;
  /** totalAmount + internationalSurchargeAmount — this is what's actually charged via Razorpay. */
  amountPayable: number;
  cycleStartDate: Date;
  dueDate: Date;
  scheduleDays: number[];
  scheduleTime: string;
  planType: PlanType;
  model: PricingModel;
  /** Cycle model only: "YYYY-MM-DD" of the cycle start. */
  cycleStartKey: string | null;
  /** Cycle model only: last day of the cycle (inclusive). */
  cycleEndDate: Date | null;
  /** Cycle model only: length of every session, locked at booking. */
  sessionLengthMinutes: number | null;
}
export interface PriceOptions {
  model: PricingModel;
  /** True only when the order is first created — verify/webhook must never reject an already-paid start date. */
  enforceStartNotPast: boolean;
  /** Session length recorded in the order's notes, so a later course edit can't change what was booked. */
  lockedSessionLengthMinutes?: number | null;
}
