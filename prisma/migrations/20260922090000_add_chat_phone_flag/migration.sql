-- Chat phone-number flagging (06-OPEN-DECISIONS.md #31, Sep 22, 2026).
-- Additive only: no column, table or enum value is dropped, renamed or
-- altered. See the ChatMessage / NotificationType / ActivityAction
-- doc-comments in schema.prisma.

-- AlterEnum: notification type for the new feature (Admin-only, never
-- sent to the Parent/Teacher who sent or received the message).
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CHAT_PHONE_NUMBER_FLAGGED';

-- AlterEnum: activity-log action for the new feature.
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'CHAT_PHONE_NUMBER_FLAGGED';

-- AlterTable: ChatMessage — `body` is masked before saving whenever it
-- looked like it contained a phone number; `originalBody` keeps the
-- unmasked text for Admin's moderation view only.
ALTER TABLE "ChatMessage" ADD COLUMN "containsPhoneNumber" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ChatMessage" ADD COLUMN "originalBody" TEXT;

-- CreateIndex: Admin's "flagged messages in this room" query.
CREATE INDEX "ChatMessage_chatRoomId_containsPhoneNumber_idx" ON "ChatMessage"("chatRoomId", "containsPhoneNumber");
