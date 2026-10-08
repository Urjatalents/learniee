import {
    parsePlanType
} from "@/features/shared/utils/cyclePlan";
import {
    CycleStatus,
    EnrollmentStatus,
    type Prisma
} from "@prisma/client";
import { CYCLE_MODEL_TAG, CreateEnrollmentInput, PriceOptions, PricedEnrollment } from './types';

/**
 * Builds the Enrollment row for either model — shared by the client
 * verify path and the webhook path so they can never drift. A
 * cycle-model enrollment is created together with its cycle 1
 * record (status OPEN, paid by `paymentId`); its sessions are NOT
 * created here, they're created once at activation.
 */
export function buildEnrollmentCreateData(args: {
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
    planType: priced.planType,
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
export function parseInputFromNotes(
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
    // Orders created before weekly plans existed have no planType.
    planType: parsePlanType(notes.planType),
  };
}
export function priceOptionsFromNotes(
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
