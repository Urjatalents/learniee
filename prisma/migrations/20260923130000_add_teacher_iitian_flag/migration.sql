-- Teacher self-declared IITian flag (Sep 2026). Additive only.
--
-- Self-declared at onboarding Step 1, no Admin approval step (unlike
-- Teacher.approvalStatus). Course creation reads this flag to force
-- every course a flagged Teacher creates to be listed as an IITian
-- course at the fixed standard rate (see coursePricing.ts /
-- course.service.ts) — the per-course "Listed by an IITian" question
-- is skipped for these teachers.

ALTER TABLE "Teacher" ADD COLUMN "isIITian" BOOLEAN NOT NULL DEFAULT false;
