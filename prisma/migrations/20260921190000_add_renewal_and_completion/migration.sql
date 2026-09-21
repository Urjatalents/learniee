-- Money and Renewal, Part 2B (Sep 21, 2026), step 2: renewal payments
-- and the COMPLETED end state for cycle-model enrollments. Additive
-- only — no column, table or enum value is dropped, renamed or altered.

-- AlterEnum: enrollment status
ALTER TYPE "EnrollmentStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';

-- AlterEnum: notification types
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CYCLE_RENEWED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ENROLLMENT_COMPLETED';

-- AlterEnum: activity-log actions
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'CYCLE_RENEWED';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'ENROLLMENT_COMPLETED';

-- AlterEnum: invoice types
ALTER TYPE "InvoiceType" ADD VALUE IF NOT EXISTS 'CYCLE_RENEWAL_PAYMENT';
