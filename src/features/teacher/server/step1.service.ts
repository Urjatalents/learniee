import { prisma } from "@/lib/prisma";
import { upsertSingleTeacherFile } from "@/features/teacher/server/teacherFile.service";
import {
  emptyStep1EditableFields,
  type CognitoProfile,
  type Step1FileInput,
  type Step1FormData,
} from "@/features/teacher/types/step1";

export type {
  CognitoProfile,
  Step1FileInput,
  Step1FormData,
} from "@/features/teacher/types/step1";

/**
 * Loads Step 1 information and existing Step 1 files.
 */
export async function getStep1FormData(
  cognitoSub: string,
  cognito: CognitoProfile,
) {
  const teacher = await prisma.teacher.findUnique({
    where: { cognitoId: cognitoSub },
    select: {
      id: true,
      visibleName: true,
      dobDay: true,
      dobMonth: true,
      dobYear: true,
      gender: true,
      nationality: true,
      address: true,
      city: true,
      country: true,
      pincode: true,
      phone: true,
      whatsapp: true,
      aboutMe: true,
      criminalCase: true,
      isIITian: true,
      currentStep: true,
      onboardingStatus: true,
      approvalStatus: true,
      files: {
        where: { type: { in: ["PROFILE_PHOTO", "INTRO_VIDEO"] } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!teacher) {
    return {
      exists: false as const,
      teacherId: null,
      formData: { ...cognito, ...emptyStep1EditableFields },
      currentStep: 0,
      onboardingStatus: "NOT_STARTED",
      approvalStatus: null,
      files: { profilePhoto: null, introVideo: null },
    };
  }

  const profilePhoto =
    teacher.files.find((file) => file.type === "PROFILE_PHOTO") ?? null;
  const introVideo =
    teacher.files.find((file) => file.type === "INTRO_VIDEO") ?? null;

  return {
    exists: true as const,
    teacherId: teacher.id,
    formData: {
      ...cognito,
      visibleName: teacher.visibleName || "",
      dobDay: teacher.dobDay !== null ? String(teacher.dobDay) : "",
      dobMonth: teacher.dobMonth || "",
      dobYear: teacher.dobYear !== null ? String(teacher.dobYear) : "",
      gender: teacher.gender || "",
      nationality: teacher.nationality || "",
      address: teacher.address || "",
      city: teacher.city || "",
      country: teacher.country || "",
      pincode: teacher.pincode || "",
      phone: teacher.phone || "",
      whatsapp: teacher.whatsapp || "",
      aboutMe: teacher.aboutMe || "",
      criminalCase: teacher.criminalCase || "",
      isIITian: teacher.isIITian,
    },
    currentStep: teacher.currentStep,
    onboardingStatus: teacher.onboardingStatus,
    approvalStatus: teacher.approvalStatus,
    files: { profilePhoto, introVideo },
  };
}

/**
 * Creates or updates Step 1 personal information, plus any uploaded
 * profile photo / intro video (via the shared TeacherFile helper).
 */
export async function saveStep1FormData(
  cognitoSub: string,
  cognito: CognitoProfile,
  input: Omit<Step1FormData, "firstName" | "lastName" | "email"> &
    Step1FileInput,
) {
  const editableData = {
    visibleName: input.visibleName,
    dobDay: input.dobDay ? Number(input.dobDay) : null,
    dobMonth: input.dobMonth || null,
    dobYear: input.dobYear ? Number(input.dobYear) : null,
    gender: input.gender,
    nationality: input.nationality,
    address: input.address,
    city: input.city,
    country: input.country,
    pincode: input.pincode,
    phone: input.phone,
    whatsapp: input.whatsapp,
    aboutMe: input.aboutMe,
    criminalCase: input.criminalCase,
    isIITian: Boolean(input.isIITian),
  };

  const teacher = await prisma.teacher.upsert({
    where: { cognitoId: cognitoSub },
    update: {
      ...cognito,
      ...editableData,
      currentStep: 2,
      onboardingStatus: "IN_PROGRESS",
    },
    create: {
      cognitoId: cognitoSub,
      ...cognito,
      ...editableData,
      currentStep: 2,
      onboardingStatus: "IN_PROGRESS",
      approvalStatus: "PENDING",
    },
  });

  if (input.profilePhoto) {
    await upsertSingleTeacherFile(
      teacher.id,
      "PROFILE_PHOTO",
      input.profilePhoto,
    );
  }

  if (input.introVideo) {
    await upsertSingleTeacherFile(teacher.id, "INTRO_VIDEO", input.introVideo);
  }

  return teacher;
}
