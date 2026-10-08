import type {
    SessionReviewItem,
    SessionReviewListing
} from "@/features/shared/types/sessionReview";
import {
    adminReviewKind
} from "@/features/shared/utils/outcomeConfirmation";
import {
    overlapPercent,
    type SessionStatusValue
} from "@/features/shared/utils/sessionOutcome";
import { prisma } from "@/lib/prisma";
import {
    ClassSessionStatus,
    OutcomeConfirmation,
    RescheduleRequestStatus,
    type Prisma
} from "@prisma/client";
import "server-only";

/**
 * Admin's side of the after-class rules (Part 2A): the queue of
 * sessions whose outcome Admin has to decide — a parent reported a
 * problem, or both joined for under half the class (`NEEDS_REVIEW`) —
 * and the decision itself.
 *
 * Every decision, and every later override, needs a reason. It is
 * written three times: the `SessionOutcomeDecision` audit row, the
 * Activity Log, and the notice to the parent and teacher.
 *
 * A decision changes the outcome through the SAME machinery the
 * automatic outcomes use, so nothing new can drift:
 *   - counters are re-derived (`recomputeEnrollmentCounters`),
 *   - the follow-up for the new outcome (make-up, strike, notice) is
 *     applied exactly once (`runSessionFollowUps`); the follow-up of
 *     the OLD outcome is undone first, in the same transaction,
 *   - the cycle is checked for closing (also inside
 *     `runSessionFollowUps`),
 *   - if the cycle had ALREADY closed, its counted / forfeited totals
 *     and its ledger row are corrected while Accounts has not acted
 *     on them yet (`reconcileClosedCycle`).
 *
 * The transaction starts with the cycle lock every other cycle writer
 * takes, then re-checks the status Admin was looking at.
 */

export class SessionReviewError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
const HISTORY_SIZE = 5;
const OPEN_LIMIT = 200;
const DECIDED_LIMIT = 50;
const reviewInclude = {
  student: { select: { firstName: true, visibleName: true } },
  teacher: { select: { firstName: true, lastName: true, visibleName: true } },
  parent: { select: { firstName: true, lastName: true } },
  enrollment: { select: { course: { select: { courseTitle: true } } } },
  cycle: {
    select: {
      cycleNumber: true,
      status: true,
      countedSessionCount: true,
      forfeitedSessionCount: true,
    },
  },
  outcomeDecisions: { orderBy: { createdAt: "desc" }, take: HISTORY_SIZE },
} satisfies Prisma.ClassSessionInclude;
type ReviewRow = Prisma.ClassSessionGetPayload<{ include: typeof reviewInclude }>;
function iso(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}
function fullName(p: { firstName: string; lastName?: string | null; visibleName?: string | null }) {
  return p.visibleName?.trim() || `${p.firstName} ${p.lastName ?? ""}`.trim();
}
function toItem(row: ReviewRow): SessionReviewItem {
  const status = row.status as SessionStatusValue;
  const kind = adminReviewKind({ status, confirmation: row.confirmation }) ?? "DECISION";

  const times =
    row.startsAt && row.endsAt ? { startsAt: row.startsAt, endsAt: row.endsAt } : null;

  return {
    id: row.id,
    kind,
    reason:
      row.status === ClassSessionStatus.NEEDS_REVIEW
        ? "NEEDS_REVIEW"
        : row.confirmation === OutcomeConfirmation.ADMIN_DECIDED
          ? "DECIDED"
          : "REPORTED",
    status,
    cancelledByRole: row.cancelledByRole,
    cancelReason: row.cancelReason,
    sessionNumber: row.sessionNumber,
    startsAt: iso(row.startsAt),
    endsAt: iso(row.endsAt),
    teacherStartedAt: iso(row.teacherStartedAt),
    teacherEndedAt: iso(row.teacherEndedAt),
    studentJoinedAt: iso(row.studentJoinedAt),
    overlapPercent: times ? overlapPercent(times, row.overlapSeconds) : null,
    courseTitle: row.enrollment.course.courseTitle,
    teacherName: fullName(row.teacher),
    studentName: fullName(row.student),
    parentName: fullName(row.parent),
    reportNote: row.reportNote,
    reportedAt: iso(row.reportedAt),
    teacherSummary: row.teacherSummary,
    cycle: row.cycle
      ? {
          cycleNumber: row.cycle.cycleNumber,
          status: row.cycle.status,
          countedSessionCount: row.cycle.countedSessionCount,
          forfeitedSessionCount: row.cycle.forfeitedSessionCount,
        }
      : null,
    history: row.outcomeDecisions.map((d) => ({
      id: d.id,
      kind: d.kind,
      fromStatus: d.fromStatus as SessionStatusValue,
      toStatus: d.toStatus as SessionStatusValue,
      reason: d.reason,
      decidedByName: d.decidedByName,
      createdAt: d.createdAt.toISOString(),
    })),
  };
}
/**
 * The Admin page: what needs a decision (oldest first) and what was
 * decided recently (newest first, each open to an override).
 */
export async function listSessionReviews(): Promise<SessionReviewListing> {
  const [open, decided] = await Promise.all([
    prisma.classSession.findMany({
      where: {
        cycleId: { not: null },
        OR: [
          { status: ClassSessionStatus.NEEDS_REVIEW },
          { confirmation: OutcomeConfirmation.REPORTED, settledAt: null },
        ],
      },
      include: reviewInclude,
      orderBy: [{ reportedAt: "asc" }, { resolvedAt: "asc" }],
      take: OPEN_LIMIT,
    }),
    prisma.classSession.findMany({
      where: {
        cycleId: { not: null },
        confirmation: OutcomeConfirmation.ADMIN_DECIDED,
      },
      include: reviewInclude,
      orderBy: { settledAt: "desc" },
      take: DECIDED_LIMIT,
    }),
  ]);

  return { open: open.map(toItem), decided: decided.map(toItem) };
}
export interface AdminActor {
  sub: string;
  name: string | null;
  email: string | null;
}
export interface SessionDecisionInput {
  sessionId: string;
  /** The outcome Admin picked. Equal to the current one = "the recorded outcome stands". */
  toStatus: string;
  /** The status Admin was looking at — a stale page is refused, not applied. */
  expectedStatus: string;
  reason: string;
  admin: AdminActor;
}
export const CANCEL_STATUSES: ClassSessionStatus[] = [
  ClassSessionStatus.CANCELLED,
  ClassSessionStatus.CANCELLED_LATE,
];
export const PENDING_RESCHEDULE: RescheduleRequestStatus[] = [
  RescheduleRequestStatus.PENDING_TEACHER_APPROVAL,
  RescheduleRequestStatus.PENDING_PARENT_APPROVAL,
];
