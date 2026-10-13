import "server-only";

import {
  BankAccountStatus,
  BlogPostStatus,
  ClassRequestStatus,
  ChatReportStatus,
  ClassSessionStatus,
  ComplaintStatus,
  CourseStatus,
  EnrollmentStatus,
  LedgerPayoutStatus,
  LeaveRequestStatus,
  OutcomeConfirmation,
  RefundRequestStatus,
  TeacherApprovalStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { AdminQueueCounts } from "@/features/admin/types/queueCounts";

/** Teacher strikes newer than this count as "needs a look" on the sidebar. */
const RECENT_STRIKE_DAYS = 7;

/**
 * One round trip for every number the Admin sidebar and dashboard show.
 * Each count mirrors the filter its own queue screen uses, so a badge
 * never disagrees with the list behind it.
 */
export async function getAdminQueueCounts(): Promise<AdminQueueCounts> {
  const strikeSince = new Date(Date.now() - RECENT_STRIKE_DAYS * 24 * 60 * 60 * 1000);

  const [
    teachers,
    courses,
    enrollments,
    bankAccounts,
    blogs,
    classReviews,
    strikes,
    leave,
    classRequests,
    chatReports,
    complaints,
    refunds,
    payouts,
  ] = await Promise.all([
    prisma.teacher.count({ where: { approvalStatus: TeacherApprovalStatus.PENDING } }),
    prisma.course.count({ where: { status: CourseStatus.UNDER_REVIEW } }),
    prisma.enrollment.count({ where: { status: EnrollmentStatus.PENDING_ADMIN_APPROVAL } }),
    prisma.bankAccount.count({ where: { status: BankAccountStatus.PENDING } }),
    prisma.blogPost.count({ where: { status: BlogPostStatus.PENDING_REVIEW } }),
    prisma.classSession.count({
      where: {
        cycleId: { not: null },
        OR: [
          { status: ClassSessionStatus.NEEDS_REVIEW },
          { confirmation: OutcomeConfirmation.REPORTED, settledAt: null },
        ],
      },
    }),
    prisma.teacherStrike.count({
      where: { waivedAt: null, createdAt: { gte: strikeSince } },
    }),
    prisma.leaveRequest.count({ where: { status: LeaveRequestStatus.PENDING } }),
    prisma.classRequest.count({ where: { status: ClassRequestStatus.PENDING_REVIEW } }),
    prisma.chatMessageReport.count({ where: { status: ChatReportStatus.OPEN } }),
    prisma.complaint.count({ where: { status: ComplaintStatus.OPEN } }),
    prisma.refundRequest.count({ where: { status: RefundRequestStatus.PENDING } }),
    prisma.tuitionLedgerEntry.count({
      where: {
        payoutStatus: { in: [LedgerPayoutStatus.ON_HOLD, LedgerPayoutStatus.REJECTED] },
        adminReviewedAt: null,
      },
    }),
  ]);

  return {
    teachers,
    courses,
    enrollments,
    bankAccounts,
    blogs,
    classReviews,
    strikes,
    leave,
    classRequests,
    chatReports,
    complaints,
    refunds,
    payouts,
  };
}
