-- Account Access: Admin/IT password reset + email/phone change
-- (Sep 23, 2026). Additive only — three enum values, no column,
-- table or existing value touched. First use (the account-access
-- service/routes) is in application code only, not in this file.

-- AlterEnum
ALTER TYPE "ActivityActorRole" ADD VALUE IF NOT EXISTS 'IT';

-- AlterEnum
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'ACCOUNT_PASSWORD_RESET';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'ACCOUNT_CONTACT_UPDATED';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ACCOUNT_CREDENTIALS_UPDATED';
