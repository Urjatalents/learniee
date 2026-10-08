import {
    buildCyclePlan,
    getCyclePlanProblem,
    isStartDateInPast,
    parsePlanType,
    priceForSessions
} from "@/features/shared/utils/cyclePlan";
import { sessionLengthForCourse } from "@/features/shared/utils/sessionLength";
import {
    isInternationalParent,
    priceWithInternationalSurcharge,
} from "@/lib/internationalPayments";
import {
    calendarDateToDate,
    isValidTimeOfDay,
    toDateKey,
    todayInPlatformTz,
} from "@/lib/platformTime";
import { prisma } from "@/lib/prisma";
import { CreateEnrollmentInput, EnrollmentError, MAX_NO_OF_MONTHS, MAX_SESSIONS_PER_MONTH, MIN_SESSIONS_PER_MONTH, PriceOptions, PricedEnrollment, SCHEDULE_TIME_PATTERN } from './types';

/**
 * Legacy pricing — All the validation + pricing that used to live inline in
 * `createEnrollment()`. Pulled out so both the payment-order step
 * and the payment-verify step run the exact same server-side
 * calculation — the client's price preview is never trusted for the
 * actual charge amount.
 *
 * Pricing formula (flagged back in 06-OPEN-DECISIONS.md as an
 * assumption pending sign-off — see schema.prisma's Enrollment
 * doc-comment for the full reasoning):
 *   ratePerSession = Course.price
 *   monthlyRate    = ratePerSession * sessionsPerMonth
 *   totalAmount    = monthlyRate * noOfMonths
 *   dueDate        = cycleStartDate + 1 month
 */
async function priceLegacyEnrollment(
  parentId: string,
  input: CreateEnrollmentInput,
): Promise<PricedEnrollment> {
  const sessionsPerMonth = input.sessionsPerMonth as number;

  if (
    !Number.isInteger(sessionsPerMonth) ||
    sessionsPerMonth < MIN_SESSIONS_PER_MONTH ||
    sessionsPerMonth > MAX_SESSIONS_PER_MONTH
  ) {
    throw new EnrollmentError(
      `sessionsPerMonth must be a whole number between ${MIN_SESSIONS_PER_MONTH} and ${MAX_SESSIONS_PER_MONTH}.`,
    );
  }

  const noOfMonths = input.noOfMonths ?? 1;

  if (!Number.isInteger(noOfMonths) || noOfMonths < 1 || noOfMonths > MAX_NO_OF_MONTHS) {
    throw new EnrollmentError(
      `noOfMonths must be a whole number between 1 and ${MAX_NO_OF_MONTHS}.`,
    );
  }

  const scheduleDays = Array.from(new Set(input.scheduleDays ?? [])).sort(
    (a, b) => a - b,
  );

  if (
    scheduleDays.length === 0 ||
    scheduleDays.some((d) => !Number.isInteger(d) || d < 0 || d > 6)
  ) {
    throw new EnrollmentError(
      "Pick at least one day of the week for classes.",
    );
  }

  if (
    !input.scheduleTime ||
    !SCHEDULE_TIME_PATTERN.test(input.scheduleTime)
  ) {
    throw new EnrollmentError(
      "Pick a valid class time (HH:mm).",
    );
  }

  // Same not-found-vs-not-yours guard used by
  // demoCoupon.service.ts / student.service.ts.
  const student = await prisma.student.findFirst({
    where: { id: input.studentId, parentId },
    select: { id: true },
  });

  if (!student) {
    throw new EnrollmentError(
      "This child profile doesn't belong to your account.",
      404,
    );
  }

  const course = await prisma.course.findFirst({
    where: {
      id: input.courseId,
      teacherId: input.teacherId,
      status: "APPROVED",
    },
    select: { id: true, subject: true, price: true },
  });

  if (!course) {
    throw new EnrollmentError(
      "Course not found, or isn't open for enrollment yet.",
      404,
    );
  }

  if (course.price == null) {
    throw new EnrollmentError(
      "This course doesn't have a rate set yet — ask the teacher to add one before enrolling.",
    );
  }

  const cycleStartDate = input.cycleStartDate
    ? new Date(input.cycleStartDate)
    : new Date();

  if (Number.isNaN(cycleStartDate.getTime())) {
    throw new EnrollmentError(
      "That doesn't look like a valid start date — pick again.",
    );
  }

  const dueDate = new Date(cycleStartDate);
  dueDate.setMonth(dueDate.getMonth() + 1);

  const ratePerSession = Number(course.price);
  const monthlyRate = ratePerSession * sessionsPerMonth;
  const totalAmount = monthlyRate * noOfMonths;

  const subject = (input.subject ?? course.subject ?? "").trim() || null;

  // Parent already confirmed to exist (the student lookup above is
  // scoped to `parentId`) — fetch the two fields that decide whether
  // the international surcharge applies. See
  // src/lib/internationalPayments.ts for the detection logic and
  // why this is a self-declared signal, not real-time card detection.
  const parent = await prisma.parentProfile.findUnique({
    where: { id: parentId },
    select: { nriOrIndian: true, country: true },
  });

  const { isInternationalPayment, surchargeAmount, amountPayable } =
    priceWithInternationalSurcharge(
      totalAmount,
      parent ? isInternationalParent(parent) : false,
    );

  return {
    studentId: input.studentId,
    subject,
    sessionsPerMonth,
    noOfMonths,
    ratePerSession,
    monthlyRate,
    totalAmount,
    isInternationalPayment,
    internationalSurchargeAmount: surchargeAmount,
    amountPayable,
    cycleStartDate,
    dueDate,
    scheduleDays,
    scheduleTime: input.scheduleTime,
    planType: "MONTHLY",
    model: "LEGACY",
    cycleStartKey: null,
    cycleEndDate: null,
    sessionLengthMinutes: null,
  };
}
/**
 * Cycle-model pricing (Part 1A). Same server-side-only trust rules
 * as the legacy function: the client's preview is never used for the
 * charge.
 *
 *   plan           = buildCyclePlan(startDate, weekdays)   // cyclePlan.ts
 *   sessionCount   = weekdays matching dates in the cycle  (min 4)
 *   ratePerSession = Course.price
 *   totalAmount    = ratePerSession x sessionCount
 *   dueDate        = day after the cycle ends (next cycle start)
 *
 * `sessionsPerMonth` is set to the cycle's session count and
 * `noOfMonths` to 1, so the ledger, rate calculator and every
 * screen that reads those two fields keep working unchanged.
 */
async function priceCycleEnrollment(
  parentId: string,
  input: CreateEnrollmentInput,
  options: PriceOptions,
): Promise<PricedEnrollment> {
  const scheduleDays = Array.from(new Set(input.scheduleDays ?? [])).sort(
    (a, b) => a - b,
  );

  if (
    scheduleDays.length === 0 ||
    scheduleDays.some((d) => !Number.isInteger(d) || d < 0 || d > 6)
  ) {
    throw new EnrollmentError("Pick at least one day of the week for classes.");
  }

  if (!isValidTimeOfDay(input.scheduleTime)) {
    throw new EnrollmentError("Pick a valid class time (HH:mm).");
  }

  const today = todayInPlatformTz();
  const startKey = input.cycleStartDate?.trim() || toDateKey(today);
  const planType = parsePlanType(input.planType);
  const plan = buildCyclePlan(startKey, scheduleDays, planType);

  if (!plan) {
    throw new EnrollmentError(
      "That doesn't look like a valid start date — pick again.",
    );
  }

  if (options.enforceStartNotPast && isStartDateInPast(plan.startDate, today)) {
    throw new EnrollmentError("The start date can't be in the past.");
  }

  const planProblem = getCyclePlanProblem(plan);

  if (planProblem) {
    throw new EnrollmentError(planProblem);
  }

  const student = await prisma.student.findFirst({
    where: { id: input.studentId, parentId },
    select: { id: true },
  });

  if (!student) {
    throw new EnrollmentError(
      "This child profile doesn't belong to your account.",
      404,
    );
  }

  const course = await prisma.course.findFirst({
    where: {
      id: input.courseId,
      teacherId: input.teacherId,
      status: "APPROVED",
    },
    select: { id: true, subject: true, price: true, duration: true },
  });

  if (!course) {
    throw new EnrollmentError(
      "Course not found, or isn't open for enrollment yet.",
      404,
    );
  }

  if (course.price == null) {
    throw new EnrollmentError(
      "This course doesn't have a rate set yet — ask the teacher to add one before enrolling.",
    );
  }

  const ratePerSession = Number(course.price);
  const totalAmount = priceForSessions(ratePerSession, plan.sessionCount);
  const subject = (input.subject ?? course.subject ?? "").trim() || null;

  const parent = await prisma.parentProfile.findUnique({
    where: { id: parentId },
    select: { nriOrIndian: true, country: true },
  });

  const { isInternationalPayment, surchargeAmount, amountPayable } =
    priceWithInternationalSurcharge(
      totalAmount,
      parent ? isInternationalParent(parent) : false,
    );

  return {
    studentId: input.studentId,
    subject,
    sessionsPerMonth: plan.sessionCount,
    noOfMonths: 1,
    ratePerSession,
    monthlyRate: totalAmount,
    totalAmount,
    isInternationalPayment,
    internationalSurchargeAmount: surchargeAmount,
    amountPayable,
    cycleStartDate: calendarDateToDate(plan.startDate),
    dueDate: calendarDateToDate(plan.nextCycleStart),
    scheduleDays,
    scheduleTime: input.scheduleTime,
    planType,
    model: "CYCLE_V1",
    cycleStartKey: toDateKey(plan.startDate),
    cycleEndDate: calendarDateToDate(plan.endDate),
    sessionLengthMinutes:
      options.lockedSessionLengthMinutes ??
      sessionLengthForCourse(course.duration),
  };
}
export function priceEnrollment(
  parentId: string,
  input: CreateEnrollmentInput,
  options: PriceOptions,
): Promise<PricedEnrollment> {
  return options.model === "CYCLE_V1"
    ? priceCycleEnrollment(parentId, input, options)
    : priceLegacyEnrollment(parentId, input);
}
