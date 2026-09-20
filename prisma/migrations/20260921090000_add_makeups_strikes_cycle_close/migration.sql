-- Make-ups, teacher strikes and cycle close, Part 1C (Sep 21, 2026).
-- Additive only: no column, table or enum value is dropped, renamed or
-- altered. See the ClassSession / EnrollmentCycle / TeacherStrike
-- doc-comments in schema.prisma.

-- AlterEnum: notification types for follow-ups and leave shifts
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SESSION_MAKEUP_SCHEDULED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SESSION_TEACHER_NO_SHOW';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SESSION_STUDENT_NO_SHOW';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SESSION_MOVED_FOR_LEAVE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TEACHER_STRIKE_RECORDED';

-- AlterEnum: activity-log actions
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'SESSION_MAKEUP_CREATED';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'TEACHER_STRIKE_RECORDED';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'SESSION_MOVED_FOR_LEAVE';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'CYCLE_CLOSED';

-- CreateEnum
CREATE TYPE "CycleCloseReason" AS ENUM ('ALL_SESSIONS_FINAL', 'WINDOW_ENDED');
CREATE TYPE "TeacherStrikeReason" AS ENUM ('TEACHER_NO_SHOW', 'TEACHER_CANCELLED');

-- AlterTable: ClassSession
ALTER TABLE "ClassSession" ADD COLUMN "makeupForSessionId" TEXT;
ALTER TABLE "ClassSession" ADD COLUMN "followUpAppliedAt" TIMESTAMP(3);

-- AlterTable: EnrollmentCycle
ALTER TABLE "EnrollmentCycle" ADD COLUMN "closedAt" TIMESTAMP(3);
ALTER TABLE "EnrollmentCycle" ADD COLUMN "closeReason" "CycleCloseReason";
ALTER TABLE "EnrollmentCycle" ADD COLUMN "countedSessionCount" INTEGER;
ALTER TABLE "EnrollmentCycle" ADD COLUMN "forfeitedSessionCount" INTEGER;

-- CreateTable
CREATE TABLE "TeacherStrike" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "classSessionId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "reason" "TeacherStrikeReason" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherStrike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClassSession_makeupForSessionId_key" ON "ClassSession"("makeupForSessionId");
CREATE UNIQUE INDEX "TeacherStrike_classSessionId_key" ON "TeacherStrike"("classSessionId");
CREATE INDEX "TeacherStrike_teacherId_createdAt_idx" ON "TeacherStrike"("teacherId", "createdAt");

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_makeupForSessionId_fkey" FOREIGN KEY ("makeupForSessionId") REFERENCES "ClassSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TeacherStrike" ADD CONSTRAINT "TeacherStrike_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherStrike" ADD CONSTRAINT "TeacherStrike_classSessionId_fkey" FOREIGN KEY ("classSessionId") REFERENCES "ClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
