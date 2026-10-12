-- Refund requests (Oct 12, 2026), part 2 of 2. Additive only: a new enum and a
-- new table; nothing existing is altered or dropped. See the RefundRequest
-- model's doc-comment in schema.prisma.

-- CreateEnum
CREATE TYPE "RefundRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "RefundRequest" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RefundRequestStatus" NOT NULL DEFAULT 'PENDING',
    "amountPaid" DECIMAL(10,2) NOT NULL,
    "approvedAmount" DECIMAL(10,2),
    "adminNote" TEXT,
    "decidedBySub" TEXT,
    "decidedByName" TEXT,
    "decidedAt" TIMESTAMP(3),
    "walletTransactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefundRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RefundRequest_walletTransactionId_key" ON "RefundRequest"("walletTransactionId");
CREATE INDEX "RefundRequest_parentId_createdAt_idx" ON "RefundRequest"("parentId", "createdAt");
CREATE INDEX "RefundRequest_status_createdAt_idx" ON "RefundRequest"("status", "createdAt");
CREATE INDEX "RefundRequest_invoiceId_idx" ON "RefundRequest"("invoiceId");

-- AddForeignKey
ALTER TABLE "RefundRequest" ADD CONSTRAINT "RefundRequest_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ParentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RefundRequest" ADD CONSTRAINT "RefundRequest_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
