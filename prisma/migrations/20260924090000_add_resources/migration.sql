-- Resource Library (Sep 24, 2026). Additive only: no column, table
-- or enum value is dropped, renamed or altered. See the Resource
-- model's doc-comment in schema.prisma.

-- AlterEnum: notification type for the new feature
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RESOURCE_SHARED';

-- AlterEnum: activity-log action for the new feature
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'RESOURCE_SHARED';

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('FILE', 'LINK');

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "ResourceType" NOT NULL DEFAULT 'FILE',
    "fileKey" TEXT,
    "fileName" TEXT,
    "externalUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Resource_enrollmentId_idx" ON "Resource"("enrollmentId");
CREATE INDEX "Resource_teacherId_idx" ON "Resource"("teacherId");
CREATE INDEX "Resource_parentId_idx" ON "Resource"("parentId");
CREATE INDEX "Resource_studentId_idx" ON "Resource"("studentId");

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ParentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
