-- Community: one global Teacher + Admin + staff group chat (Sep 2026).
-- Additive only — one new enum and one new table. Nothing existing is touched.

-- CreateEnum
CREATE TYPE "CommunitySenderRole" AS ENUM ('TEACHER', 'ADMIN', 'ACCOUNTS', 'HR', 'IT');

-- CreateTable
CREATE TABLE "CommunityMessage" (
    "id" TEXT NOT NULL,
    "senderRole" "CommunitySenderRole" NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isAnnouncement" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommunityMessage_createdAt_idx" ON "CommunityMessage"("createdAt");

-- CreateIndex
CREATE INDEX "CommunityMessage_updatedAt_idx" ON "CommunityMessage"("updatedAt");
