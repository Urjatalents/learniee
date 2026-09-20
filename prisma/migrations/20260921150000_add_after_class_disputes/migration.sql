-- After-class summary, parent confirmation and Admin session review,
-- Part 2A (Sep 21, 2026). Additive only: no column, table or enum value
-- is dropped, renamed or altered. See the ClassSession /
-- SessionOutcomeDecision doc-comments in schema.prisma.

-- AlterEnum: notification types
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SESSION_OUTCOME_REPORTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SESSION_OUTCOME_DECIDED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SESSION_NEEDS_REVIEW';

-- AlterEnum: activity-log actions
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'SESSION_OUTCOME_REPORTED';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'SESSION_OUTCOME_DECIDED';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'SESSION_OUTCOME_OVERRIDDEN';

-- CreateEnum
CREATE TYPE "OutcomeConfirmation" AS ENUM ('PARENT_ACCEPTED', 'AUTO_ACCEPTED', 'REPORTED', 'ADMIN_DECIDED');
CREATE TYPE "OutcomeDecisionKind" AS ENUM ('DECISION', 'OVERRIDE');

-- AlterTable: ClassSession (all nullable, no defaults — legacy rows stay untouched)
ALTER TABLE "ClassSession" ADD COLUMN "teacherSummary" TEXT;
ALTER TABLE "ClassSession" ADD COLUMN "teacherSummaryAt" TIMESTAMP(3);
ALTER TABLE "ClassSession" ADD COLUMN "confirmation" "OutcomeConfirmation";
ALTER TABLE "ClassSession" ADD COLUMN "reportedAt" TIMESTAMP(3);
ALTER TABLE "ClassSession" ADD COLUMN "reportNote" TEXT;
ALTER TABLE "ClassSession" ADD COLUMN "settledAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SessionOutcomeDecision" (
    "id" TEXT NOT NULL,
    "classSessionId" TEXT NOT NULL,
    "kind" "OutcomeDecisionKind" NOT NULL,
    "fromStatus" "ClassSessionStatus" NOT NULL,
    "toStatus" "ClassSessionStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "decidedBySub" TEXT NOT NULL,
    "decidedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionOutcomeDecision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClassSession_cycleId_settledAt_idx" ON "ClassSession"("cycleId", "settledAt");
CREATE INDEX "ClassSession_confirmation_idx" ON "ClassSession"("confirmation");
CREATE INDEX "SessionOutcomeDecision_classSessionId_createdAt_idx" ON "SessionOutcomeDecision"("classSessionId", "createdAt");
CREATE INDEX "SessionOutcomeDecision_createdAt_idx" ON "SessionOutcomeDecision"("createdAt");

-- AddForeignKey
ALTER TABLE "SessionOutcomeDecision" ADD CONSTRAINT "SessionOutcomeDecision_classSessionId_fkey" FOREIGN KEY ("classSessionId") REFERENCES "ClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
