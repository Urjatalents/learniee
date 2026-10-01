-- Custom class requests (Oct 1, 2026). Additive only: no column, table or enum
-- value is dropped, renamed or altered. See the ClassRequest model's doc-comment.

-- AlterEnum: new notification types + activity-log actions (none used in this file)
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CLASS_REQUEST_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CLASS_REQUEST_REVIEWED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CLASS_REQUEST_VACANCY';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CLASS_REQUEST_ACCEPTED';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'CLASS_REQUEST_REVIEWED';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'CLASS_REQUEST_CLOSED';

-- CreateEnum
CREATE TYPE "ClassRequestStatus" AS ENUM ('PENDING_REVIEW', 'OPEN', 'REJECTED', 'CLOSED');
CREATE TYPE "ClassRequestResponseStatus" AS ENUM ('ACCEPTED', 'DECLINED');

-- CreateTable
CREATE TABLE "ClassRequest" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "studentId" TEXT,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "grade" TEXT,
    "board" TEXT,
    "language" TEXT,
    "sessionsPerWeek" INTEGER,
    "preferredSchedule" TEXT,
    "budgetPerSession" DECIMAL(10,2),
    "description" TEXT NOT NULL,
    "status" "ClassRequestStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "adminNote" TEXT,
    "reviewedBySub" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "circulatedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClassRequestResponse" (
    "id" TEXT NOT NULL,
    "classRequestId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "status" "ClassRequestResponseStatus" NOT NULL,
    "note" TEXT,
    "courseId" TEXT,
    "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassRequestResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClassRequest_parentId_idx" ON "ClassRequest"("parentId");
CREATE INDEX "ClassRequest_status_createdAt_idx" ON "ClassRequest"("status", "createdAt");
CREATE UNIQUE INDEX "ClassRequestResponse_courseId_key" ON "ClassRequestResponse"("courseId");
CREATE UNIQUE INDEX "ClassRequestResponse_classRequestId_teacherId_key" ON "ClassRequestResponse"("classRequestId", "teacherId");
CREATE INDEX "ClassRequestResponse_teacherId_idx" ON "ClassRequestResponse"("teacherId");

-- AddForeignKey
ALTER TABLE "ClassRequest" ADD CONSTRAINT "ClassRequest_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ParentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassRequest" ADD CONSTRAINT "ClassRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClassRequestResponse" ADD CONSTRAINT "ClassRequestResponse_classRequestId_fkey" FOREIGN KEY ("classRequestId") REFERENCES "ClassRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassRequestResponse" ADD CONSTRAINT "ClassRequestResponse_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassRequestResponse" ADD CONSTRAINT "ClassRequestResponse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
