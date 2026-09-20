-- Cycle model, Part 1A (Sep 20, 2026). Additive only: no column, table
-- or enum value is dropped or altered. See the `EnrollmentCycle`
-- model's doc-comment in schema.prisma.

-- CreateEnum
CREATE TYPE "CycleStatus" AS ENUM ('OPEN', 'CLOSED');

-- AlterTable: Enrollment
ALTER TABLE "Enrollment" ADD COLUMN "isLegacy" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Enrollment" ADD COLUMN "sessionLengthMinutes" INTEGER;

-- Every Enrollment that exists at this point predates the cycle model.
-- Rows created after this migration keep the column default (false).
UPDATE "Enrollment" SET "isLegacy" = true;

-- AlterTable: ClassSession
ALTER TABLE "ClassSession" ADD COLUMN "cycleId" TEXT;
ALTER TABLE "ClassSession" ADD COLUMN "sessionNumber" INTEGER;
ALTER TABLE "ClassSession" ADD COLUMN "startsAt" TIMESTAMP(3);
ALTER TABLE "ClassSession" ADD COLUMN "endsAt" TIMESTAMP(3);
ALTER TABLE "ClassSession" ADD COLUMN "lengthMinutes" INTEGER;

-- CreateTable
CREATE TABLE "EnrollmentCycle" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "cycleNumber" INTEGER NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "sessionCount" INTEGER NOT NULL,
    "ratePerSession" DECIMAL(10,2) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "paymentReference" TEXT,
    "status" "CycleStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnrollmentCycle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EnrollmentCycle_enrollmentId_idx" ON "EnrollmentCycle"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentCycle_enrollmentId_cycleNumber_key" ON "EnrollmentCycle"("enrollmentId", "cycleNumber");

-- CreateIndex
CREATE INDEX "ClassSession_cycleId_idx" ON "ClassSession"("cycleId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassSession_cycleId_sessionNumber_key" ON "ClassSession"("cycleId", "sessionNumber");

-- AddForeignKey
ALTER TABLE "EnrollmentCycle" ADD CONSTRAINT "EnrollmentCycle_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "EnrollmentCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
