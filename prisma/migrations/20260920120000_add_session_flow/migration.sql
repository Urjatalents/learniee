-- Session flow and outcomes, Part 1B (Sep 20, 2026). Additive only: no
-- column, table or enum value is dropped, renamed or altered. See the
-- ClassSessionStatus / ClassSession doc-comments in schema.prisma.

-- AlterEnum: new event-based session outcomes
ALTER TYPE "ClassSessionStatus" ADD VALUE IF NOT EXISTS 'STUDENT_NO_SHOW';
ALTER TYPE "ClassSessionStatus" ADD VALUE IF NOT EXISTS 'TEACHER_NO_SHOW';
ALTER TYPE "ClassSessionStatus" ADD VALUE IF NOT EXISTS 'CANCELLED_LATE';
ALTER TYPE "ClassSessionStatus" ADD VALUE IF NOT EXISTS 'NEEDS_REVIEW';

-- AlterEnum: activity-log action for non-completed outcomes
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'CLASS_SESSION_OUTCOME';

-- AlterTable: ClassSession
ALTER TABLE "ClassSession" ADD COLUMN "teacherStartedAt" TIMESTAMP(3);
ALTER TABLE "ClassSession" ADD COLUMN "teacherEndedAt" TIMESTAMP(3);
ALTER TABLE "ClassSession" ADD COLUMN "studentJoinedAt" TIMESTAMP(3);
ALTER TABLE "ClassSession" ADD COLUMN "resolvedAt" TIMESTAMP(3);
ALTER TABLE "ClassSession" ADD COLUMN "overlapSeconds" INTEGER;
ALTER TABLE "ClassSession" ADD COLUMN "cancelledByRole" TEXT;
ALTER TABLE "ClassSession" ADD COLUMN "countersAppliedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ClassSession_status_endsAt_idx" ON "ClassSession"("status", "endsAt");
