-- Teacher interview + appeal cooldown (Oct 7, 2026). Additive only.
-- Enum values are added here but never used in this file.

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TEACHER_INTERVIEW_SCHEDULED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TEACHER_APPEALED';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'TEACHER_INTERVIEW_SCHEDULED';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'TEACHER_APPEALED';

-- AlterTable: Teacher
ALTER TABLE "Teacher" ADD COLUMN "interviewScheduledAt" TIMESTAMP(3);
ALTER TABLE "Teacher" ADD COLUMN "interviewDetails" TEXT;
ALTER TABLE "Teacher" ADD COLUMN "rejectedAt" TIMESTAMP(3);
ALTER TABLE "Teacher" ADD COLUMN "reapplyAvailableAt" TIMESTAMP(3);
ALTER TABLE "Teacher" ADD COLUMN "appealCount" INTEGER NOT NULL DEFAULT 0;

-- Teachers already rejected before this change get the same 30-day cooldown,
-- counted from their last update.
UPDATE "Teacher"
SET "rejectedAt" = "updatedAt",
    "reapplyAvailableAt" = "updatedAt" + INTERVAL '30 days'
WHERE "approvalStatus" = 'REJECTED';
