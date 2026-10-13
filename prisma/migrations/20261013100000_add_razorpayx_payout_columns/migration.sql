-- RazorpayX real payouts (Oct 13, 2026), part 2 of 2. Additive only.

-- AlterTable
ALTER TABLE "BankAccount" ADD COLUMN "razorpayContactId" TEXT,
ADD COLUMN "razorpayFundAccountId" TEXT,
ADD COLUMN "fundAccountKey" TEXT;

-- AlterTable
ALTER TABLE "PayoutRecord" ADD COLUMN "gatewayStatus" TEXT,
ADD COLUMN "utr" TEXT,
ADD COLUMN "processedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "PayoutRecord_status_idx" ON "PayoutRecord"("status");

-- CreateIndex
CREATE INDEX "PayoutRecord_razorpayPayoutId_idx" ON "PayoutRecord"("razorpayPayoutId");
