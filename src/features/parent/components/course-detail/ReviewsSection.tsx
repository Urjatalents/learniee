"use client";

import { useState } from "react";
import { Loader2, Star } from "lucide-react";

import { useCourseReviews } from "@/features/parent/hooks/useCourseReviews";

interface Props {
  courseId: string;
}

/**
 * Real Parent reviews for a course (added Sep 17, 2026) — replaces
 * the earlier sample-content placeholder. Reviews are Phase 2 scope
 * per 02-ARCHITECTURE.md's Deliberately Deferred list, built ahead
 * of MVP by explicit request. A Parent can leave exactly one review
 * per course, and only while they have an ACTIVE enrollment in it
 * (see review.service.ts) — `canReview` from the API already
 * encodes both checks, so this component just renders what it's
 * told rather than re-deriving eligibility itself.
 */
export default function ReviewsSection({ courseId }: Props) {
  const {
    reviews,
    averageRating,
    totalReviews,
    canReview,
    myReview,
    loading,
    error,
    submitting,
    submitReview,
  } = useCourseReviews(courseId);

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [formError, setFormError] = useState("");

  async function handleSubmit() {
    setFormError("");

    if (rating < 1) {
      setFormError("Pick a star rating first.");
      return;
    }

    const ok = await submitReview(rating, comment);

    if (ok) {
      setRating(0);
      setComment("");
    }
  }

  return (
    <div className="bg-white border border-violet-100 rounded-3xl shadow-sm p-5 sm:p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-heading text-base font-bold text-gray-800">
          Reviews
        </h2>
        {totalReviews > 0 && (
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Star size={14} className="text-brand-yellow fill-brand-yellow" />
            <span className="font-bold">{averageRating?.toFixed(1)}</span>
            <span className="text-xs text-gray-400">({totalReviews})</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2 mt-4">
          <div className="h-16 bg-violet-50 rounded-2xl" />
          <div className="h-16 bg-violet-50 rounded-2xl" />
        </div>
      ) : (
        <>
          {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

          {canReview && (
            <div className="border border-violet-100 rounded-2xl p-4 bg-violet-50/30 mb-4">
              <p className="text-xs font-bold text-gray-700 mb-2">
                Leave a review
              </p>

              <div className="flex items-center gap-1 mb-2">
                {Array.from({ length: 5 }).map((_, i) => {
                  const value = i + 1;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      onMouseEnter={() => setHoverRating(value)}
                      onMouseLeave={() => setHoverRating(0)}
                      aria-label={`${value} star${value > 1 ? "s" : ""}`}
                    >
                      <Star
                        size={22}
                        className={
                          value <= (hoverRating || rating)
                            ? "text-brand-yellow fill-brand-yellow"
                            : "text-gray-200 fill-gray-200"
                        }
                      />
                    </button>
                  );
                })}
              </div>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="How was this course? (optional)"
                rows={3}
                className="w-full text-sm border border-violet-100 rounded-xl p-2.5 mb-2 focus:outline-none focus:ring-2 focus:ring-brand/30"
              />

              {formError && (
                <p className="text-xs text-red-600 mb-2">{formError}</p>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-white bg-brand rounded-full px-4 py-2 disabled:opacity-60"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                Submit review
              </button>
            </div>
          )}

          {myReview && (
            <div className="border border-violet-50 rounded-2xl p-4 bg-violet-50/50 mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-bold text-gray-700">You</p>
                <StarRow rating={myReview.rating} />
              </div>
              {myReview.comment && (
                <p className="text-sm text-gray-600">{myReview.comment}</p>
              )}
            </div>
          )}

          {reviews.length === 0 ? (
            <p className="text-sm text-gray-400">
              No reviews yet — be the first to share how this course went.
            </p>
          ) : (
            <div className="space-y-3">
              {reviews
                .filter((r) => r.id !== myReview?.id)
                .map((review) => (
                  <div
                    key={review.id}
                    className="border border-violet-50 rounded-2xl p-4 bg-violet-50/30"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-bold text-gray-700">
                        {`Parent ${review.parent.firstName}`.trim()}
                      </p>
                      <StarRow rating={review.rating} />
                    </div>
                    {review.comment && (
                      <p className="text-sm text-gray-600">{review.comment}</p>
                    )}
                  </div>
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={12}
          className={
            i < rating
              ? "text-brand-yellow fill-brand-yellow"
              : "text-gray-200 fill-gray-200"
          }
        />
      ))}
    </div>
  );
}
