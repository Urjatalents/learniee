/**
 * Standard per-session course pricing (Sep 2026 decision).
 *
 * Std 1-7  -> 400
 * Std 8-10 -> 500
 * Std 11-12 -> 700
 * IITian-listed course -> always 700, regardless of grade
 *
 * NOTE: the requested tiers overlap at "Std 10" (given as both the
 * top of "8-10" and the bottom of "10-12"). Resolved here as Grade 10
 * = 500 (falls in the 8-10 band). Confirm this is right and adjust
 * GRADE_PRICE_TIERS below if Grade 10 should be 700 instead.
 *
 * Pure functions only — no DB/Prisma access — so they're usable from
 * both the server (course.service.ts, authoritative) and the client
 * (live price hint on the create-course form).
 */

export const IITIAN_DEFAULT_PRICE = 700;

interface GradePriceTier {
  minGrade: number;
  maxGrade: number;
  price: number;
}

const GRADE_PRICE_TIERS: GradePriceTier[] = [
  { minGrade: 1, maxGrade: 7, price: 400 },
  { minGrade: 8, maxGrade: 10, price: 500 },
  { minGrade: 11, maxGrade: 12, price: 700 },
];

/**
 * Pulls the numeric grade out of the GRADE_OPTIONS shape ("Grade 8" -> 8).
 * Returns null for anything that doesn't contain a number.
 */
export function parseGradeNumber(grade: string | null | undefined): number | null {
  if (!grade) return null;

  const match = grade.match(/\d+/);
  if (!match) return null;

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * The platform-standard per-session price for a course, given its
 * selected grade and whether the teacher is listing it as an IITian.
 * Returns null when neither a recognised grade nor the IITian flag
 * is set — in that case the teacher must supply their own price and
 * there is nothing to compare it against.
 */
export function getStandardPrice(
  grade: string | null | undefined,
  isIITian: boolean,
): number | null {
  if (isIITian) return IITIAN_DEFAULT_PRICE;

  const gradeNumber = parseGradeNumber(grade);
  if (gradeNumber == null) return null;

  const tier = GRADE_PRICE_TIERS.find(
    (t) => gradeNumber >= t.minGrade && gradeNumber <= t.maxGrade,
  );

  return tier ? tier.price : null;
}
