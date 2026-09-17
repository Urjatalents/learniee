import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";
import {
  createReview,
  getReviewsForCourse,
  ReviewError,
} from "@/features/shared/server/review.service";

/**
 * GET — public review list + aggregate rating for this course, plus
 * whether the logged-in Parent can leave one (an ACTIVE enrollment
 * in this course, and no existing review) and their own review if
 * they already have one.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const { courseId } = await params;
    const parent = await requireParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    const result = await getReviewsForCourse(courseId, parent.parentId);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Parent course reviews GET error:", error);

    return NextResponse.json(
      { error: "Failed to load reviews." },
      { status: 500 },
    );
  }
}

/**
 * POST { rating: 1-5, comment?: string }
 *
 * Creates the Parent's one-and-only review for this course. Fails
 * with 403 if they don't currently have an ACTIVE enrollment in it,
 * or 409 if they've already reviewed it.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const { courseId } = await params;
    const parent = await requireParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    const input = await req.json();

    if (typeof input.rating !== "number") {
      return NextResponse.json({ error: "rating is required." }, { status: 400 });
    }

    const review = await createReview(parent.parentId, courseId, {
      rating: input.rating,
      comment: typeof input.comment === "string" ? input.comment : null,
    });

    return NextResponse.json({ success: true, review }, { status: 201 });
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Parent course reviews POST error:", error);

    return NextResponse.json({ error: "Failed to submit review." }, { status: 500 });
  }
}
