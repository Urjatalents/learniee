-- Chat message reports (Sep 30, 2026). Additive only: no column, table or
-- enum value is dropped, renamed or altered. See the ChatMessageReport
-- model's doc-comment in schema.prisma.

-- AlterEnum: notification type + activity-log action for the new feature
-- (neither value is used in this file)
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CHAT_MESSAGE_REPORTED';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'CHAT_MESSAGE_REPORTED';

-- CreateEnum
CREATE TYPE "ChatReportStatus" AS ENUM ('OPEN', 'REVIEWED');

-- CreateTable
CREATE TABLE "ChatMessageReport" (
    "id" TEXT NOT NULL,
    "chatMessageId" TEXT NOT NULL,
    "chatRoomId" TEXT NOT NULL,
    "reporterRole" "ChatSenderRole" NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT,
    "status" "ChatReportStatus" NOT NULL DEFAULT 'OPEN',
    "reviewedAt" TIMESTAMP(3),
    "reviewedBySub" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessageReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatMessageReport_chatMessageId_reporterRole_reporterId_key" ON "ChatMessageReport"("chatMessageId", "reporterRole", "reporterId");
CREATE INDEX "ChatMessageReport_status_createdAt_idx" ON "ChatMessageReport"("status", "createdAt");
CREATE INDEX "ChatMessageReport_chatRoomId_idx" ON "ChatMessageReport"("chatRoomId");

-- AddForeignKey
ALTER TABLE "ChatMessageReport" ADD CONSTRAINT "ChatMessageReport_chatMessageId_fkey" FOREIGN KEY ("chatMessageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatMessageReport" ADD CONSTRAINT "ChatMessageReport_chatRoomId_fkey" FOREIGN KEY ("chatRoomId") REFERENCES "ChatRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
