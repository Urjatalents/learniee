-- Enrollment plan type: monthly (existing) or weekly cycles (Oct 3, 2026). Additive only.
CREATE TYPE "EnrollmentPlanType" AS ENUM ('MONTHLY', 'WEEKLY');

ALTER TABLE "Enrollment" ADD COLUMN "planType" "EnrollmentPlanType" NOT NULL DEFAULT 'MONTHLY';
