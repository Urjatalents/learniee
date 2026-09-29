-- Public Blog (Sep 29, 2026). Additive only: no column, table or enum
-- value is dropped, renamed or altered. See the BlogPost model's
-- doc-comment in schema.prisma.

-- AlterEnum: notification types for the new feature
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BLOG_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BLOG_PUBLISHED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BLOG_REJECTED';

-- AlterEnum: activity-log actions for the new feature
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'BLOG_SUBMITTED';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'BLOG_PUBLISHED';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'BLOG_REJECTED';

-- CreateEnum
CREATE TYPE "BlogPostStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED');

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "readingMinutes" INTEGER NOT NULL DEFAULT 1,
    "status" "BlogPostStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedBySub" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");
CREATE INDEX "BlogPost_status_publishedAt_idx" ON "BlogPost"("status", "publishedAt");
CREATE INDEX "BlogPost_teacherId_idx" ON "BlogPost"("teacherId");
CREATE INDEX "BlogPost_category_status_idx" ON "BlogPost"("category", "status");

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
