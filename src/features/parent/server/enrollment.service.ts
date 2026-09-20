import { prisma } from "@/lib/prisma";
import {
  CycleStatus,
  EnrollmentStatus,
  InvoiceType,
  type Prisma,
} from "@prisma/client";
import {
  getRazorpayClient,
  rupeesToPaise,
  verifyCheckoutSignature,
} from "@/lib/razorpay";
import {
  isInternationalParent,
  priceWithInternationalSurcharge,
} from "@/lib/internationalPayments";
import { processReferralRewardForNewEnrollment } from "@/features/shared/server/referral.service";
import { notifyEnrollmentCreated } from "@/features/shared/server/notificationTriggers.service";
import { generateInvoiceForPayment } from "@/features/shared/server/invoice.service";
import {
  buildCyclePlan,
  getCyclePlanProblem,
  isStartDateInPast,
  priceForSessions,
} from "@/features/shared/utils/cyclePlan";
import { sessionLengthForCourse } from "@/features/shared/utils/sessionLength";
import {
  calendarDateToDate,
  isValidTimeOfDay,
  toDateKey,
  todayInPlatformTz,
} from "@/lib/platformTime";

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
const MIN_SESSIONS_PER_MONTH = 4;
const MAX_SESSIONS_PER_MONTH = 31;
const MAX_NO_OF_MONTHS = 12;

// 0=Sunday..6=Saturday (JS Date.getDay() convention).
const SCHEDULE_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

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
const CYCLE_MODEL_TAG = "CYCLE_V1";

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
  /** Weekly recurring class days — 0=Sunday..6=Saturday, at least one required. */
  scheduleDays: number[];
  /** Weekly recurring class time, 24-hour "HH:mm". */
  scheduleTime: string;
}

interface PricedEnrollment {
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
  model: PricingModel;
  /** Cycle model only: "YYYY-MM-DD" of the cycle start. */
  cycleStartKey: string | null;
  /** Cycle model only: last day of the cycle (inclusive). */
  cycleEndDate: Date | null;
  /** Cycle model only: length of every session, locked at booking. */
  sessionLengthMinutes: number | null;
}

interface PriceOptions {
  model: PricingModel;
  /** True only when the order is first created — verify/webhook must never reject an already-paid start date. */
  enforceStartNotPast: boolean;
  /** Session length recorded in the order's notes, so a later course edit can't change what was booked. */
  lockedSessionLengthMinutes?: number | null;
}

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
  const plan = buildCyclePlan(startKey, scheduleDays);

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
    model: "CYCLE_V1",
    cycleStartKey: toDateKey(plan.startDate),
    cycleEndDate: calendarDateToDate(plan.endDate),
    sessionLengthMinutes:
      options.lockedSessionLengthMinutes ??
      sessionLengthForCourse(course.duration),
  };
}

function priceEnrollment(
  parentId: string,
  input: CreateEnrollmentInput,
  options: PriceOptions,
): Promise<PricedEnrollment> {
  return options.model === "CYCLE_V1"
    ? priceCycleEnrollment(parentId, input, options)
    : priceLegacyEnrollment(parentId, input);
}

/**
 * Builds the Enrollment row for either model — shared by the client
 * verify path and the webhook path so they can never drift. A
 * cycle-model enrollment is created together with its cycle 1
 * record (status OPEN, paid by `paymentId`); its sessions are NOT
 * created here, they're created once at activation.
 */
function buildEnrollmentCreateData(args: {
  parentId: string;
  input: CreateEnrollmentInput;
  priced: PricedEnrollment;
  orderId: string;
  paymentId: string;
}): Prisma.EnrollmentUncheckedCreateInput {
  const { parentId, input, priced, orderId, paymentId } = args;
  const isCycleModel = priced.model === "CYCLE_V1";

  return {
    studentId: priced.studentId,
    parentId,
    teacherId: input.teacherId,
    courseId: input.courseId,
    subject: priced.subject,
    sessionsPerMonth: priced.sessionsPerMonth,
    noOfMonths: priced.noOfMonths,
    ratePerSession: priced.ratePerSession,
    monthlyRate: priced.monthlyRate,
    totalAmount: priced.totalAmount,
    cycleStartDate: priced.cycleStartDate,
    dueDate: priced.dueDate,
    scheduleDays: priced.scheduleDays,
    scheduleTime: priced.scheduleTime,
    isLegacy: !isCycleModel,
    sessionLengthMinutes: priced.sessionLengthMinutes,
    // Payment already succeeded by this point — go straight into
    // the Teacher's review queue (resolves #2's sequential flow).
    status: EnrollmentStatus.PENDING_TEACHER_APPROVAL,
    razorpayOrderId: orderId,
    razorpayPaymentId: paymentId,
    // amountPaid is the actual charge (base + international
    // surcharge, if any) — can legitimately differ from
    // totalAmount now, which is exactly what amountPaid being a
    // separate field was already designed for.
    amountPaid: priced.amountPayable,
    isInternationalPayment: priced.isInternationalPayment,
    internationalSurchargeAmount: priced.internationalSurchargeAmount,
    ...(isCycleModel && priced.cycleEndDate
      ? {
          cycles: {
            create: {
              cycleNumber: 1,
              startDate: priced.cycleStartDate,
              endDate: priced.cycleEndDate,
              sessionCount: priced.sessionsPerMonth,
              ratePerSession: priced.ratePerSession,
              price: priced.totalAmount,
              paymentReference: paymentId,
              status: CycleStatus.OPEN,
            },
          },
        }
      : {}),
    // Every Enrollment gets exactly one ChatRoom, created in the
    // same write — it's the sole Parent<->Teacher communication
    // channel throughout the whole approval flow, so it needs to
    // exist from the moment payment clears.
    chatRoom: {
      create: {
        parentId,
        teacherId: input.teacherId,
        courseId: input.courseId,
        studentId: priced.studentId,
      },
    },
  };
}

/** Rebuilds the booking input from a Razorpay order's `notes` (the webhook's only source of truth). */
function parseInputFromNotes(
  notes: Record<string, unknown>,
): CreateEnrollmentInput {
  return {
    studentId: String(notes.studentId ?? ""),
    teacherId: String(notes.teacherId ?? ""),
    courseId: String(notes.courseId ?? ""),
    subject: notes.subject ? String(notes.subject) : null,
    sessionsPerMonth: Number(notes.sessionsPerMonth),
    noOfMonths: Number(notes.noOfMonths) || 1,
    cycleStartDate: notes.cycleStartDate
      ? String(notes.cycleStartDate)
      : undefined,
    scheduleDays: (() => {
      try {
        return JSON.parse(String(notes.scheduleDays ?? "[]"));
      } catch {
        return [];
      }
    })(),
    scheduleTime: String(notes.scheduleTime ?? ""),
  };
}

function priceOptionsFromNotes(
  notes: Record<string, unknown>,
): PriceOptions {
  const locked = Number(notes.sessionLengthMinutes);

  return {
    model: notes.model === CYCLE_MODEL_TAG ? "CYCLE_V1" : "LEGACY",
    // The order already exists and was paid — never reject it now
    // because the calendar rolled over to the next day.
    enforceStartNotPast: false,
    lockedSessionLengthMinutes:
      Number.isFinite(locked) && locked > 0 ? locked : null,
  };
}

/**
 * Step 1 of the paid-enrollment flow. Validates + prices the
 * enrollment exactly like before, but instead of writing an
 * Enrollment row, creates a Razorpay Order for `totalAmount` (in
 * INR — see src/lib/razorpay.ts for why no forex math happens on
 * our side) and returns it for the client to open Razorpay
 * Checkout against.
 *
 * DECIDED (resolves 06-OPEN-DECISIONS.md #36): Enrollment creation
 * now blocks on payment — no Enrollment row exists until
 * `verifyEnrollmentPayment()` confirms the charge. Nothing is
 * written to the DB here, so an abandoned checkout just leaves no
 * trace instead of a stray unpaid row.
 */
export async function createEnrollmentOrder(
  parentId: string,
  input: CreateEnrollmentInput,
) {
  const priced = await priceEnrollment(parentId, input, {
    model: "CYCLE_V1",
    enforceStartNotPast: true,
  });

  const razorpay = getRazorpayClient();

  const order = await razorpay.orders.create({
    // Charges the surcharge-inclusive amount for international
    // parents — see src/lib/internationalPayments.ts. Domestic
    // parents get amountPayable === totalAmount, unchanged.
    amount: rupeesToPaise(priced.amountPayable),
    currency: "INR",
    // Razorpay caps receipt at 40 chars — keep it short.
    receipt: `enr_${Date.now()}`,
    // Full enough to reconstruct the Enrollment from the webhook
    // alone (src/app/api/webhooks/razorpay/route.ts) if the client
    // never calls /verify — e.g. tab closed right after paying.
    notes: {
      kind: "enrollment",
      parentId,
      studentId: priced.studentId,
      teacherId: input.teacherId,
      courseId: input.courseId,
      subject: priced.subject ?? "",
      model: CYCLE_MODEL_TAG,
      // "YYYY-MM-DD" in the platform timezone; the session count is
      // re-derived from it + scheduleDays, never trusted from here.
      cycleStartDate: priced.cycleStartKey ?? "",
      sessionCount: priced.sessionsPerMonth,
      sessionLengthMinutes: priced.sessionLengthMinutes ?? 0,
      scheduleDays: JSON.stringify(priced.scheduleDays),
      scheduleTime: priced.scheduleTime,
    },
  });

  return { order, pricing: priced };
}

export interface VerifyEnrollmentPaymentInput extends CreateEnrollmentInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

/**
 * Step 2 of the paid-enrollment flow. Re-verifies the checkout
 * signature, re-fetches the order from Razorpay directly (never
 * trusts the amount the client reports back), re-runs the exact
 * same pricing used to create the order, and only then writes the
 * Enrollment row.
 *
 * Idempotent on `razorpayOrderId` (unique in the schema) — if this
 * is called twice for the same order (e.g. a retried client
 * request after a flaky network response), the second call just
 * returns the already-created Enrollment instead of erroring or
 * double-charging/double-creating.
 */
export async function verifyEnrollmentPayment(
  parentId: string,
  clientInput: VerifyEnrollmentPaymentInput,
) {
  const existing = await prisma.enrollment.findUnique({
    where: { razorpayOrderId: clientInput.razorpayOrderId },
    include: { chatRoom: { select: { id: true } } },
  });

  if (existing) {
    return existing;
  }

  const signatureOk = verifyCheckoutSignature({
    orderId: clientInput.razorpayOrderId,
    paymentId: clientInput.razorpayPaymentId,
    signature: clientInput.razorpaySignature,
  });

  if (!signatureOk) {
    throw new EnrollmentError(
      "Payment verification failed. If money was deducted, it will be auto-refunded — contact support if it isn't reversed within a few days.",
      400,
    );
  }

  const razorpay = getRazorpayClient();
  const order = await razorpay.orders.fetch(clientInput.razorpayOrderId);

  if (order.status !== "paid") {
    throw new EnrollmentError(
      `Payment isn't complete yet (status: ${order.status}). Please retry the payment.`,
      402,
    );
  }

  const notes = (order.notes ?? {}) as Record<string, unknown>;
  const options = priceOptionsFromNotes(notes);

  // Under the cycle model the order's own notes are the source of
  // truth for what was booked (start date, weekdays, time) — not the
  // request body — so a verify call can't swap the schedule after
  // paying. Orders from before the cycle model (no `model` note) keep
  // using the request body exactly as they always did.
  let input: VerifyEnrollmentPaymentInput = clientInput;

  if (options.model === "CYCLE_V1") {
    if (notes.parentId && String(notes.parentId) !== parentId) {
      throw new EnrollmentError("This payment belongs to another account.", 403);
    }

    input = { ...clientInput, ...parseInputFromNotes(notes) };
  }

  const priced = await priceEnrollment(parentId, input, options);

  const expectedPaise = rupeesToPaise(priced.amountPayable);

  if (Number(order.amount) !== expectedPaise) {
    // The order amount no longer matches what this course/cycle
    // combination prices to right now (e.g. Course.price changed
    // mid-checkout, or the parent's international status changed) —
    // refuse rather than create an Enrollment for the wrong amount.
    // The payment itself already succeeded against Razorpay's
    // order, so this needs a manual refund.
    throw new EnrollmentError(
      "The paid amount no longer matches this course's current price — contact support with your payment ID for a refund.",
      409,
    );
  }

  const enrollment = await prisma.enrollment.create({
    data: buildEnrollmentCreateData({
      parentId,
      input,
      priced,
      orderId: input.razorpayOrderId,
      paymentId: input.razorpayPaymentId,
    }),
    // Included so the client can immediately offer "chat with your
    // teacher" right after payment confirmation without a second
    // round trip.
    include: { chatRoom: { select: { id: true } } },
  });

  // Refer & Earn: if this Parent was referred and this is their
  // first-ever Enrollment, credit the referrer's Wallet. Never lets
  // a referral-processing failure block the payment/Enrollment
  // response the Parent is waiting on.
  try {
    await processReferralRewardForNewEnrollment(parentId, enrollment.id);
  } catch (err) {
    console.error("Referral reward processing failed (enrollment still succeeded):", err);
  }

  await notifyEnrollmentCreated(enrollment.id);

  // Invoices (Sep 11, 2026) — a receipt for the payment that just
  // cleared, visible to this Parent and to Accounts/Admin. Never
  // lets a receipt-generation failure block the response the Parent
  // is waiting on (same reasoning as the referral try/catch above).
  try {
    await generateInvoiceForPayment({
      type: InvoiceType.ENROLLMENT_PAYMENT,
      payerId: parentId,
      amount: Number(enrollment.amountPaid),
      description: `Enrollment payment${priced.subject ? ` — ${priced.subject}` : ""}`,
      referenceType: "ENROLLMENT",
      referenceId: enrollment.id,
      razorpayOrderId: enrollment.razorpayOrderId,
      razorpayPaymentId: enrollment.razorpayPaymentId,
    });
  } catch (err) {
    console.error("Invoice generation failed (enrollment still succeeded):", err);
  }

  return enrollment;
}

/**
 * Reconciliation path used ONLY by the Razorpay webhook
 * (src/app/api/webhooks/razorpay/route.ts) for `payment.captured`
 * events on `kind: "enrollment"` orders. Unlike
 * `verifyEnrollmentPayment()`, there's no browser-side checkout
 * signature here — the webhook route itself is the trust boundary
 * (it verifies `X-Razorpay-Signature` against the raw body before
 * ever calling this). This is the safety net for the case where the
 * client paid successfully but never called `/verify` (closed tab,
 * lost network, etc.) — without it, Razorpay would have captured
 * money for an Enrollment that never got created.
 *
 * Idempotent on `razorpayOrderId`, same as `verifyEnrollmentPayment()`.
 */
export async function reconcileEnrollmentFromWebhook(
  orderId: string,
  paymentId: string,
) {
  const existing = await prisma.enrollment.findUnique({
    where: { razorpayOrderId: orderId },
  });

  if (existing) {
    return existing;
  }

  const razorpay = getRazorpayClient();
  const order = await razorpay.orders.fetch(orderId);

  if (order.status !== "paid") {
    return null;
  }

  const notes = (order.notes ?? {}) as Record<string, unknown>;

  if (notes.kind !== "enrollment") {
    return null;
  }

  const input = parseInputFromNotes(notes);
  const parentId = String(notes.parentId ?? "");

  if (!parentId || !input.studentId || !input.teacherId || !input.courseId) {
    console.error("Razorpay webhook: enrollment order missing notes", orderId);
    return null;
  }

  const priced = await priceEnrollment(
    parentId,
    input,
    priceOptionsFromNotes(notes),
  );
  const expectedPaise = rupeesToPaise(priced.amountPayable);

  if (Number(order.amount) !== expectedPaise) {
    console.error("Razorpay webhook: enrollment amount mismatch", orderId);
    return null;
  }

  const enrollment = await prisma.enrollment.create({
    data: buildEnrollmentCreateData({
      parentId,
      input,
      priced,
      orderId,
      paymentId,
    }),
  });

  // Same Refer & Earn hook as verifyEnrollmentPayment() — this path
  // exists specifically for the "paid but /verify never got called"
  // case, so it needs the same reward trigger, not just the happy
  // path.
  try {
    await processReferralRewardForNewEnrollment(parentId, enrollment.id);
  } catch (err) {
    console.error("Referral reward processing failed (webhook enrollment still succeeded):", err);
  }

  await notifyEnrollmentCreated(enrollment.id);

  // Same Invoice hook as verifyEnrollmentPayment() — this path is
  // the safety net for a payment that captured on Razorpay's side
  // but whose client never confirmed back, so it needs the same
  // receipt written, not just the happy path.
  try {
    await generateInvoiceForPayment({
      type: InvoiceType.ENROLLMENT_PAYMENT,
      payerId: parentId,
      amount: Number(enrollment.amountPaid),
      description: `Enrollment payment${priced.subject ? ` — ${priced.subject}` : ""}`,
      referenceType: "ENROLLMENT",
      referenceId: enrollment.id,
      razorpayOrderId: enrollment.razorpayOrderId,
      razorpayPaymentId: enrollment.razorpayPaymentId,
    });
  } catch (err) {
    console.error("Invoice generation failed (webhook enrollment still succeeded):", err);
  }

  return enrollment;
}

/**
 * Lists every enrollment a parent has made, most recent first — for
 * a future "My enrollments"/Payments view. Also the shape Accounts'
 * Tuition Ledger will eventually read from (joined with
 * ParentProfile/Student/Teacher for the name fields, per
 * 03-DATA-MODEL.md's note that names aren't duplicated here).
 */
export async function getEnrollmentsForParent(parentId: string) {
  return prisma.enrollment.findMany({
    where: { parentId },
    orderBy: { createdAt: "desc" },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          visibleName: true,
        },
      },
      teacher: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          visibleName: true,
        },
      },
      course: {
        select: { id: true, courseTitle: true },
      },
      chatRoom: {
        select: { id: true },
      },
    },
  });
}
