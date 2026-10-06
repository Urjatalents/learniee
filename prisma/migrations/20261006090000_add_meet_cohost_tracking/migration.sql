-- Co-host verification for Google Meet rooms (Oct 6, 2026). Additive only:
-- four nullable columns and one NOT NULL column with a default.

-- AlterTable: ClassSession
ALTER TABLE "ClassSession" ADD COLUMN "meetCohostEmail" TEXT;
ALTER TABLE "ClassSession" ADD COLUMN "meetCohostConfirmedAt" TIMESTAMP(3);
ALTER TABLE "ClassSession" ADD COLUMN "meetCohostCheckedAt" TIMESTAMP(3);
ALTER TABLE "ClassSession" ADD COLUMN "meetCohostAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ClassSession" ADD COLUMN "meetCohostError" TEXT;
