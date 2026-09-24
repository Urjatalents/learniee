-- Community announcements (Sep 2026). Additive only — one enum value.
-- First use is in application code only, not in this file, and this
-- is deliberately a separate migration from the table above.

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'COMMUNITY_ANNOUNCEMENT';
