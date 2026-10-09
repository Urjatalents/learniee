import "server-only";

import { cache } from "react";
import { CourseStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { createPresignedDownloadUrl } from "@/lib/s3";
import { getTeacherRatingsByIds } from "@/features/shared/server/review.service";

import type { FilterableCourse } from "./filter";

/**
 * Data for the PUBLIC class-listing pages (/courses/*, /counselling/*).
 * Same visibility rule as the Parent course list: CourseStatus.APPROVED
 * only. Do not widen the `where` without checking 06-OPEN-DECISIONS.md.
 * Only fields that are already shown to Parents are selected.
 */

/** Hard cap so a very large catalogue cannot blow up a page render. */
const MAX_COURSES = 500;

/** Longer than the page's ISR window so a cached page never carries a dead image link. */
const THUMBNAIL_URL_SECONDS = 60 * 60;

export interface CatalogCourseRow extends FilterableCourse {
  id: string;
  teacherId: string;
  duration: string | null;
  language: string | null;
  price: number | null;
  thumbnailKey: string | null;
  teacherName: string;
}

export interface CatalogCourseCard {
  id: string;
  title: string;
  teacherName: string;
  subject: string | null;
  grade: string | null;
  board: string | null;
  language: string | null;
  type: string | null;
  duration: string | null;
  price: number | null;
  rating: number | null;
  reviewCount: number;
  thumbnailUrl: string | null;
}

/** Newest first. Deduped per render so several callers share one query. */
export const fetchApprovedCourses = cache(async (): Promise<CatalogCourseRow[]> => {
  const courses = await prisma.course.findMany({
    where: { status: CourseStatus.APPROVED },
    select: {
      id: true,
      teacherId: true,
      subject: true,
      courseTitle: true,
      courseTags: true,
      category: true,
      grade: true,
      board: true,
      type: true,
      duration: true,
      language: true,
      price: true,
      thumbnailKey: true,
      teacher: { select: { firstName: true, visibleName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: MAX_COURSES,
  });

  return courses.map((c) => ({
    id: c.id,
    teacherId: c.teacherId,
    subject: c.subject,
    courseTitle: c.courseTitle,
    courseTags: c.courseTags,
    category: c.category,
    grade: c.grade,
    board: c.board,
    type: c.type,
    duration: c.duration,
    language: c.language,
    price: c.price == null ? null : Number(c.price),
    thumbnailKey: c.thumbnailKey,
    teacherName: c.teacher.visibleName?.trim() || c.teacher.firstName,
  }));
});

async function signThumbnail(key: string | null): Promise<string | null> {
  if (!key) return null;
  try {
    return await createPresignedDownloadUrl(key, THUMBNAIL_URL_SECONDS);
  } catch (error) {
    // A missing/unsignable image must never take the page down.
    console.error("Catalog thumbnail signing failed:", error);
    return null;
  }
}

/** Adds teacher ratings and signed thumbnail URLs for the rows actually shown. */
export async function toCourseCards(rows: CatalogCourseRow[]): Promise<CatalogCourseCard[]> {
  if (rows.length === 0) return [];

  const ratings = await getTeacherRatingsByIds(Array.from(new Set(rows.map((r) => r.teacherId))));

  return Promise.all(
    rows.map(async (r) => {
      const rating = ratings.get(r.teacherId);
      return {
        id: r.id,
        title: r.courseTitle?.trim() || r.subject?.trim() || "Class",
        teacherName: r.teacherName,
        subject: r.subject,
        grade: r.grade,
        board: r.board,
        language: r.language,
        type: r.type,
        duration: r.duration,
        price: r.price,
        rating: rating?.averageRating ?? null,
        reviewCount: rating?.totalReviews ?? 0,
        thumbnailUrl: await signThumbnail(r.thumbnailKey),
      };
    }),
  );
}
