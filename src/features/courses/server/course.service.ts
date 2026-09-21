import { prisma } from "@/lib/prisma";

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

  certificateEnabled?: boolean;
  certificateSessionThreshold?: string;

  thumbnailKey?: string;
  introVideoKey?: string;
}

function buildCourseData(input: CourseFormInput) {
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
    price: input.price ? Number(input.price) : null,

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

