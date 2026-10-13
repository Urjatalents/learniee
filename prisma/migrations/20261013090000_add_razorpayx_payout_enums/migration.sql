-- RazorpayX real payouts (Oct 13, 2026), part 1 of 2. Additive only. The new
-- enum values are NOT used in this file (Postgres needs an enum value committed
-- before it is used); the columns come in the next migration.

-- AlterEnum
ALTER TYPE "LedgerPayoutStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';

-- AlterEnum
ALTER TYPE "PayoutRecordStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';

-- AlterEnum
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'PAYOUT_FAILED';
