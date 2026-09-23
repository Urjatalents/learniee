-- Standard course pricing (Sep 2026). Additive only.
--
-- Std 1-7 -> 400/session, Std 8-10 -> 500/session, Std 11-12 -> 700/session
-- (the requested tiers overlap at "Std 10" between the 8-10 and 10-12
-- bands; this resolves Grade 10 into the 8-10 tier at 500 -- confirm
-- with Aman and adjust src/features/courses/utils/coursePricing.ts if
-- Grade 10 should instead be 700). A course listed as IITian defaults
-- to 700 regardless of grade. `standardPrice` is a snapshot of that
-- computed rate at course creation; `isPriceCustomized` flags a
-- teacher-chosen price that differs from it, for the Admin review screen.

ALTER TABLE "Course" ADD COLUMN "isIITian" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Course" ADD COLUMN "standardPrice" DECIMAL(10,2);
ALTER TABLE "Course" ADD COLUMN "isPriceCustomized" BOOLEAN NOT NULL DEFAULT false;
