-- Add IT as a third staff-account role alongside HR/Accounts (Sep 23, 2026).
-- Additive only: no column, table or enum value is dropped, renamed or
-- altered. See the StaffAccount/StaffRole doc-comments in schema.prisma.
-- Its first use (creating IT staff accounts via the admin UI/API) is in
-- application code only, not in this migration file.

-- AlterEnum
ALTER TYPE "StaffRole" ADD VALUE IF NOT EXISTS 'IT';
