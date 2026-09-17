"use client";

import { useCallback, useEffect, useState } from "react";

export interface CourseReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  parent: {
    firstName: string;
    lastName: string;
  };
}

export interface MyReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

/** Parent-side review list + submit for one course (see review.service.ts). */
export function useCourseReviews(courseId: string) {
  const [reviews, setReviews] = useState<CourseReview[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [totalReviews, setTotalReviews] = useState(0);
  const [canReview, setCanReview] = useState(false);
  const [myReview, setMyReview] = useState<MyReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!courseId) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/parent/courses/${courseId}/reviews`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load reviews.");
      }

      setReviews(data.reviews ?? []);
      setAverageRating(data.averageRating ?? null);
      setTotalReviews(data.totalReviews ?? 0);
      setCanReview(Boolean(data.canReview));
      setMyReview(data.myReview ?? null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unable to load reviews.");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  async function submitReview(rating: number, comment: string) {
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch(`/api/parent/courses/${courseId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit review.");
      }

      await load();
      return true;
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to submit review.");
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  return {
    reviews,
    averageRating,
    totalReviews,
    canReview,
    myReview,
    loading,
    error,
    submitting,
    submitReview,
  };
}
