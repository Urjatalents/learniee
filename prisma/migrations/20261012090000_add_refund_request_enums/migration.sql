-- Refund requests (Oct 12, 2026), part 1 of 2. Additive only. The new enum
-- values are NOT used in this file (Postgres needs an enum value committed
-- before it is used); the table comes in the next migration.

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REFUND_REQUEST_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REFUND_REQUEST_DECIDED';

-- AlterEnum
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'REFUND_REQUEST_DECIDED';
