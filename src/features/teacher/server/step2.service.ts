import { prisma } from "@/lib/prisma";
import { createTeacherFiles } from "@/features/teacher/server/teacherFile.service";
import type { Step2FormInput } from "@/features/teacher/types/step2";

export type { Step2FormInput } from "@/features/teacher/types/step2";

/**
 * Shapes the raw form input into the Prisma data object shared by
 * both create and update.
 */
function buildProfessionalInfoData(input: Step2FormInput) {
  return {
    referredBy: input.referredBy || null,
    qualifications: input.qualifications || null,
    overallExperience: input.overallExperience || null,
    comfortableLanguage: input.comfortableLanguage || null,
    schoolsTaught: input.schoolsTaught || null,

    workingInSchool: Boolean(input.workingInSchool),
    schoolName: input.workingInSchool ? input.schoolName || null : null,

    workingInAcademy: Boolean(input.workingInAcademy),
    academyName: input.workingInAcademy ? input.academyName || null : null,

    studentsTaught: input.studentsTaught || null,
    hoursPerDay: input.hoursPerDay || null,

    haveOwnNotes: input.haveOwnNotes || null,
    canMakePresentations: input.canMakePresentations || null,
    provideHomework: input.provideHomework || null,
    conductPTM: input.conductPTM || null,

    hasLaptop: Boolean(input.hasLaptop),
    hasPenTab: Boolean(input.hasPenTab),
    proficientInEnglish: Boolean(input.proficientInEnglish),

    additionalInfo: input.additionalInfo || null,

    facebook: input.facebook || null,
    linkedin: input.linkedin || null,
    instagram: input.instagram || null,
    youtube: input.youtube || null,

    notWithOtherAcademy: Boolean(input.notWithOtherAcademy),
  };
}

/**
 * Loads a teacher along with Step 2 professional info and existing
 * certification/award files.
 */
export async function getTeacherWithProfessionalInfo(cognitoSub: string) {
  return prisma.teacher.findUnique({
    where: { cognitoId: cognitoSub },
    include: {
      professionalInfo: true,
      files: {
        where: { type: { in: ["CERTIFICATION", "AWARD"] } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

/**
 * Saves Step 2 professional information and uploaded files.
 */
export async function saveStep2FormData(
  teacherId: string,
  input: Step2FormInput,
) {
  const data = buildProfessionalInfoData(input);

  const professionalInfo = await prisma.teacherProfessional.upsert({
    where: { teacherId },
    update: data,
    create: { teacherId, ...data },
  });

  await prisma.teacher.update({
    where: { id: teacherId },
    data: { currentStep: 2, onboardingStatus: "IN_PROGRESS" },
  });

  // Certifications/awards are multi-file slots — existing files are never
  // deleted, each save just adds any newly-uploaded ones.
  await createTeacherFiles(teacherId, "CERTIFICATION", input.certifications);
  await createTeacherFiles(teacherId, "AWARD", input.awards);

  return professionalInfo;
}
