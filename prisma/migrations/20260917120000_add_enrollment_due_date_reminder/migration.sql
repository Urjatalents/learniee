-- Enrollment due-date payment reminder (Sep 17, 2026).
-- Resolves the "5-day reminder" gap flagged in export.service.ts's
-- file header and 04-BUILD-PLAN-TIMELINE.md's Week 4 scope: fires a
-- real in-app notification 5 days before Enrollment.dueDate instead
-- of only visually flagging it in the Accounts export.

-- AlterEnum: NotificationType
ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_DUE_REMINDER';

-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN "dueDateReminderSentAt" TIMESTAMP(3);
