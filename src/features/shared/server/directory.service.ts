import { prisma } from "@/lib/prisma";
import type { TeacherApprovalStatus } from "@prisma/client";
import { getTeacherRatingsByIds } from "@/features/shared/server/review.service";

/**
 * Admin "Teacher Directory" / "Parent Directory" — read-only summary
 * listings (02-ARCHITECTURE.md's "Shared AppShell still not built" note:
 * these are new standalone Admin pages, not part of the existing
 * `/admin/teachers` approval queue or `/admin/users` delete tool, which
 * both cover a different job).
 *
 * Every count below uses Prisma's filtered relation `_count` (a single
 * query per list, no N+1) rather than looping and issuing a query per
 * row.
 */

function displayName(p: { firstName: string; lastName: string; visibleName?: string | null }) {
  return p.visibleName?.trim() || `${p.firstName} ${p.lastName}`.trim();
}

// ---------------------------------------------------------------------------
// Teacher directory
// ---------------------------------------------------------------------------

export interface TeacherDirectoryRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  country: string | null;
  approvalStatus: TeacherApprovalStatus;
  onboardingStatus: string;
  coursesCount: number;
  activeEnrollmentsCount: number;
  /** Strikes recorded for teacher no-shows and teacher cancellations (Part 1C). */
  strikesCount: number;
  /** Average of the Parent-left course reviews for this teacher, out of 5. Null = no reviews yet. */
  averageRating: number | null;
  reviewCount: number;
  createdAt: Date;
}

export interface TeacherDirectorySummary {
  total: number;
  approvalStatus: { pending: number; approved: number; rejected: number };
  onboarding: { completed: number; inProgress: number };
}

export async function getTeacherDirectory(): Promise<{
  teachers: TeacherDirectoryRow[];
  summary: TeacherDirectorySummary;
}> {
  const [teachers, approvalGroups, onboardingCompleted, total] = await Promise.all([
    prisma.teacher.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        visibleName: true,
        email: true,
        phone: true,
        city: true,
        country: true,
        approvalStatus: true,
        onboardingStatus: true,
        createdAt: true,
        _count: {
          select: {
            courses: true,
            // Filtered relation count — only ACTIVE enrollments, not every
            // enrollment ever created against this teacher.
            enrollments: { where: { status: "ACTIVE" } },
            strikes: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.teacher.groupBy({ by: ["approvalStatus"], _count: { _all: true } }),
    prisma.teacher.count({ where: { onboardingStatus: "COMPLETED" } }),
    prisma.teacher.count(),
  ]);

  const ratings = await getTeacherRatingsByIds(teachers.map((t) => t.id));

  const approvalCounts = { pending: 0, approved: 0, rejected: 0 };
  for (const g of approvalGroups) {
    if (g.approvalStatus === "PENDING") approvalCounts.pending = g._count._all;
    else if (g.approvalStatus === "APPROVED") approvalCounts.approved = g._count._all;
    else if (g.approvalStatus === "REJECTED") approvalCounts.rejected = g._count._all;
  }

  return {
    teachers: teachers.map((t) => ({
      id: t.id,
      name: displayName(t),
      email: t.email,
      phone: t.phone,
      city: t.city,
      country: t.country,
      approvalStatus: t.approvalStatus,
      onboardingStatus: t.onboardingStatus,
      coursesCount: t._count.courses,
      activeEnrollmentsCount: t._count.enrollments,
      strikesCount: t._count.strikes,
      averageRating: ratings.get(t.id)?.averageRating ?? null,
      reviewCount: ratings.get(t.id)?.totalReviews ?? 0,
      createdAt: t.createdAt,
    })),
    summary: {
      total,
      approvalStatus: approvalCounts,
      onboarding: {
        completed: onboardingCompleted,
        inProgress: total - onboardingCompleted,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Parent directory
// ---------------------------------------------------------------------------

export interface ParentDirectoryRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  country: string | null;
  onboardingComplete: boolean;
  studentsCount: number;
  activeEnrollmentsCount: number;
  walletBalance: number;
  createdAt: Date;
}

export interface ParentDirectorySummary {
  total: number;
  onboarding: { completed: number; inProgress: number };
}

export async function getParentDirectory(): Promise<{
  parents: ParentDirectoryRow[];
  summary: ParentDirectorySummary;
}> {
  const [parents, onboardingCompleted, total] = await Promise.all([
    prisma.parentProfile.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        visibleName: true,
        email: true,
        phone: true,
        city: true,
        country: true,
        onboardingComplete: true,
        createdAt: true,
        wallet: { select: { balance: true } },
        _count: {
          select: {
            students: true,
            enrollments: { where: { status: "ACTIVE" } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.parentProfile.count({ where: { onboardingComplete: true } }),
    prisma.parentProfile.count(),
  ]);

  return {
    parents: parents.map((p) => ({
      id: p.id,
      name: displayName(p),
      email: p.email,
      phone: p.phone,
      city: p.city,
      country: p.country,
      onboardingComplete: p.onboardingComplete,
      studentsCount: p._count.students,
      activeEnrollmentsCount: p._count.enrollments,
      // Decimal → Number before it goes anywhere near JSON, same
      // convention as wallet.service.ts.
      walletBalance: p.wallet ? Number(p.wallet.balance) : 0,
      createdAt: p.createdAt,
    })),
    summary: {
      total,
      onboarding: {
        completed: onboardingCompleted,
        inProgress: total - onboardingCompleted,
      },
    },
  };
}
