import "server-only";

import { CourseStatus, TeacherApprovalStatus, TeacherFileType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { createPresignedDownloadUrl } from "@/lib/s3";
import { getTeacherRatingSummary } from "@/features/shared/server/review.service";

import type { TeacherPublicProfileResponse } from "../types";

/**
 * A Teacher's public profile + their listed courses.
 *
 * Only APPROVED teachers are returned, and only APPROVED courses — the same
 * visibility rule as the Parent course list (see parent/server/course.service.ts).
 * The `select` is an allow-list: never add email, phone, address, PAN or
 * documents here. Returns null when the teacher doesn't exist or isn't approved
 * (one 404 for both, so the response never reveals which).
 */
export async function getTeacherPublicProfile(
  teacherId: string,
): Promise<TeacherPublicProfileResponse | null> {
  const teacher = await prisma.teacher.findFirst({
    where: { id: teacherId, approvalStatus: TeacherApprovalStatus.APPROVED },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      visibleName: true,
      aboutMe: true,
      city: true,
      country: true,
      files: {
        where: { type: { in: [TeacherFileType.PROFILE_PHOTO, TeacherFileType.INTRO_VIDEO] } },
        select: { type: true, s3Key: true },
      },
      courses: {
        where: { status: CourseStatus.APPROVED },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          teacherId: true,
          subject: true,
          grade: true,
          board: true,
          type: true,
          courseTitle: true,
          price: true,
          thumbnailKey: true,
          createdAt: true,
        },
      },
    },
  });

  if (!teacher) return null;

  const rating = await getTeacherRatingSummary(teacher.id);
  const photo = teacher.files.find((f) => f.type === TeacherFileType.PROFILE_PHOTO);
  const video = teacher.files.find((f) => f.type === TeacherFileType.INTRO_VIDEO);

  const [photoUrl, introVideoUrl, courses] = await Promise.all([
    photo ? createPresignedDownloadUrl(photo.s3Key) : null,
    video ? createPresignedDownloadUrl(video.s3Key) : null,
    Promise.all(
      teacher.courses.map(async (c) => ({
        id: c.id,
        teacherId: c.teacherId,
        teacher: {
          id: teacher.id,
          firstName: teacher.firstName,
          lastName: teacher.lastName,
          visibleName: teacher.visibleName,
          averageRating: rating.averageRating,
          reviewCount: rating.totalReviews,
        },
        subject: c.subject,
        grade: c.grade,
        board: c.board,
        type: c.type,
        courseTitle: c.courseTitle,
        price: c.price ? c.price.toString() : null,
        thumbnailUrl: c.thumbnailKey ? await createPresignedDownloadUrl(c.thumbnailKey) : null,
        status: "APPROVED" as const,
        createdAt: c.createdAt.toISOString(),
      })),
    ),
  ]);

  return {
    teacher: {
      id: teacher.id,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      visibleName: teacher.visibleName,
      aboutMe: teacher.aboutMe,
      city: teacher.city,
      country: teacher.country,
      photoUrl,
      introVideoUrl,
      averageRating: rating.averageRating,
      reviewCount: rating.totalReviews,
    },
    courses,
  };
}
