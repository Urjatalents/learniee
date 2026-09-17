-- Remove Home Tuition feature: drop unused teacher-onboarding fields
ALTER TABLE "TeacherProfessional" DROP COLUMN "homeTuitionArea";
ALTER TABLE "TeacherProfessional" DROP COLUMN "canTakeHomeTuition";
