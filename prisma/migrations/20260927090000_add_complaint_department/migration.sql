-- Complaint routing: which department (Accounts / HR / IT) a complaint is for.
-- Additive. `department` is nullable so existing complaints stay valid.
CREATE TYPE "ComplaintDepartment" AS ENUM ('ACCOUNTS', 'HR', 'IT');

ALTER TABLE "Complaint" ADD COLUMN "department" "ComplaintDepartment";

CREATE INDEX "Complaint_department_idx" ON "Complaint"("department");
