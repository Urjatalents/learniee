-- Google Meet organizer pool (Oct 6, 2026). Additive only.
-- Remembers which Workspace account owns each room, so co-host and
-- member calls use the right account, and so rooms can be spread over
-- several accounts (least recently used first).

-- AlterTable: ClassSession
ALTER TABLE "ClassSession" ADD COLUMN "meetOrganizerEmail" TEXT;
ALTER TABLE "ClassSession" ADD COLUMN "meetOrganizerAssignedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ClassSession_meetOrganizerEmail_meetOrganizerAssignedAt_idx" ON "ClassSession"("meetOrganizerEmail", "meetOrganizerAssignedAt");
