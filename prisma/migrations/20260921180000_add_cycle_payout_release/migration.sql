-- Money and Renewal, Part 2B (Sep 21, 2026), step 1: decouple "cycle
-- CLOSED" from "payout released". Additive only.

-- AlterEnum: activity-log actions
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'CYCLE_PAYOUT_RELEASED';

-- AlterTable: EnrollmentCycle
ALTER TABLE "EnrollmentCycle" ADD COLUMN "payoutReleasedAt" TIMESTAMP(3);
