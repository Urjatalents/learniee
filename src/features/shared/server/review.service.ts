import "server-only";

import { Prisma, EnrollmentStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { notifyReviewSubmitted } from "@/features/shared/server/notificationTriggers.service";

/**
 * Course/Teacher Reviews (added Sep 17, 2026) — see the `Review`
 * model's doc-comment in schema.prisma. Phase 2 scope, built ahead
 * of MVP by explicit request.
 *
 * Eligibility is deliberately narrower than
 * `ACTIVE_ENROLLMENT_STATUSES` (which also allows LAPSED) — by
 * direct instruction, a Parent may only review a course while they
 * have a currently-`ACTIVE` Enrollment in it, not a lapsed one.
 * One review per (parent, course) ever — enforced by the
 * `@@unique([parentId, courseId])` constraint, surfaced here as a
 * friendly `ReviewError` before Prisma would otherwise throw P2002.
 */

export class ReviewError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const MIN_RATING = 1;
const MAX_RATING = 5;

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

/**
 * The parent's own ACTIVE enrollment in this course, if any — the
 * one that would be attached to a new review. Returns null (not an
 * error) when there isn't one; callers use this to decide whether
 * to show a "leave a review" form at all.
 */
async function findActiveEnrollmentForReview(parentId: string, courseId: string) {
  return prisma.enrollment.findFirst({
    where: {
      parentId,
      courseId,
      status: EnrollmentStatus.ACTIVE,
    },
    select: {
      id: true,
      teacherId: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * Everything the course-detail page's Reviews section needs in one
 * call: the public list of reviews, the aggregate rating, and
 * whether *this* parent can leave one (and their own review, if
 * they already have).
 */
export async function getReviewsForCourse(courseId: string, parentId?: string) {
  const [reviews, aggregate, activeEnrollment, myReview] = await Promise.all([
    prisma.review.findMany({
      where: { courseId },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        parent: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.review.aggregate({
      where: { courseId },
      _avg: { rating: true },
      _count: { rating: true },
    }),
    parentId ? findActiveEnrollmentForReview(parentId, courseId) : null,
    parentId
      ? prisma.review.findUnique({
          where: { parentId_courseId: { parentId, courseId } },
        })
      : null,
  ]);

  return {
    reviews,
    averageRating: aggregate._avg.rating,
    totalReviews: aggregate._count.rating,
    canReview: Boolean(activeEnrollment) && !myReview,
    myReview,
  };
}

/**
 * Creates the Parent's one-and-only review for a course. Re-checks
 * the ACTIVE-enrollment requirement server-side — never trust a
 * client-computed `canReview` flag for the actual write.
 */
export async function createReview(
  parentId: string,
  courseId: string,
  input: { rating: number; comment?: string | null },
) {
  const rating = Math.round(Number(input.rating));

  if (!Number.isFinite(rating) || rating < MIN_RATING || rating > MAX_RATING) {
    throw new ReviewError(`Rating must be a whole number from ${MIN_RATING} to ${MAX_RATING}.`);
  }

  const comment = input.comment?.trim() || null;

  const enrollment = await findActiveEnrollmentForReview(parentId, courseId);

  if (!enrollment) {
    throw new ReviewError(
      "You can review a course only while you have an active enrollment in it.",
      403,
    );
  }

  try {
    const review = await prisma.review.create({
      data: {
        parentId,
        courseId,
        teacherId: enrollment.teacherId,
        enrollmentId: enrollment.id,
        rating,
        comment,
      },
    });

    void notifyReviewSubmitted(review.id);

    return review;
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      throw new ReviewError("You've already reviewed this course.", 409);
    }

    throw err;
  }
}
