import { prisma } from "@/lib/prisma";
import { getStandardPrice } from "@/features/courses/utils/coursePricing";

export interface CourseFormInput {
  category: string;
  timeSlot: string;

  subject: string;
  grade: string;
  board: string;
  experience: string;

  duration: string;
  type: string;
  language: string;
  frequency: string;

  courseTitle: string;
  rating: string;
  objective: string;
  description: string;

  modules: string;
  courseTags: string;
  price: string;
  isIITian?: boolean;

  certificateEnabled?: boolean;
  certificateSessionThreshold?: string;

  thumbnailKey?: string;
  introVideoKey?: string;
}

/**
 * Standard pricing (Sep 2026). Authoritative — never trust a
 * client-computed price/flag, same principle as enrollment pricing
 * (see priceCycleEnrollment in enrollment.service.ts). `standardPrice`
 * is the tier rate for the chosen grade / IITian flag (null if
 * neither is set). A blank manual price falls back to it; a manual
 * price that differs from it sets `isPriceCustomized` for the Admin
 * review screen.
 */
function priceCourse(input: CourseFormInput) {
  const isIITian = Boolean(input.isIITian);
  const standardPrice = getStandardPrice(input.grade || null, isIITian);
  const manualPrice = input.price ? Number(input.price) : null;
  const price = manualPrice ?? standardPrice;
  const isPriceCustomized =
    standardPrice != null && manualPrice != null && manualPrice !== standardPrice;

  return { isIITian, standardPrice, price, isPriceCustomized };
}

function buildCourseData(input: CourseFormInput) {
  const { isIITian, standardPrice, price, isPriceCustomized } = priceCourse(input);

  return {
    category: input.category || null,
    timeSlot: input.timeSlot || null,

    subject: input.subject || null,
    grade: input.grade || null,
    board: input.board || null,
    experience: input.experience || null,

    duration: input.duration || null,
    type: input.type || null,
    language: input.language || null,
    frequency: input.frequency || null,

    courseTitle: input.courseTitle || null,
    rating: input.rating ? Number(input.rating) : null,
    objective: input.objective || null,
    description: input.description || null,

    modules: input.modules || null,
    courseTags: input.courseTags || null,
    price,
    isIITian,
    standardPrice,
    isPriceCustomized,

    certificateEnabled: Boolean(input.certificateEnabled),
    certificateSessionThreshold:
      input.certificateEnabled && input.certificateSessionThreshold
        ? Number(input.certificateSessionThreshold)
        : null,

    thumbnailKey: input.thumbnailKey || null,
    introVideoKey: input.introVideoKey || null,
  };
}

export async function createCourse(
  teacherId: string,
  input: CourseFormInput,
) {
  const data = buildCourseData(input);

  return prisma.course.create({
    data: {
      teacherId,
      ...data,
      status: "UNDER_REVIEW",
    },
  });
}

export async function getTeacherCourses(
  teacherId: string,
) {
  return prisma.course.findMany({
    where: {
      teacherId,
      status: {
        in: ["APPROVED", "UNDER_REVIEW"],
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

