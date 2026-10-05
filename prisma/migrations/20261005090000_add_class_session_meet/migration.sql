-- Google Meet rooms for class sessions (Oct 5, 2026). Additive only:
-- two nullable columns, nothing dropped, renamed or altered.
-- Both stay null until the first Start/Join of a cycle session while
-- GOOGLE_MEET_ENABLED=true.

-- AlterTable: ClassSession
ALTER TABLE "ClassSession" ADD COLUMN "meetSpaceName" TEXT;
ALTER TABLE "ClassSession" ADD COLUMN "meetingUri" TEXT;
