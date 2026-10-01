/**
 * Standard course pricing (Sep 2026 decision, per-HOUR since Oct 2026).
 *
 * Hourly rate:
 * Std 1-7  -> 400
 * Std 8-10 -> 500
 * Std 11-12 -> 700
 * IITian-listed course -> always 700, regardless of grade
 *
 * The per-SESSION price (`Course.price`, what enrollment multiplies) is the
 * hourly rate scaled by the lecture duration: 30 min = half, 1.5 h = 1.5x.
 * A grade RANGE ("Grade 6-8") is priced at its highest grade.
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

const MIN_GRADE = 1;
const MAX_GRADE = 12;

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
 * For a range ("Grade 6-8") returns the highest grade. Null if no number.
 */
export function parseGradeNumber(grade: string | null | undefined): number | null {
  return parseGradeRange(grade)?.to ?? null;
}

/** "Grade 8" -> {from: 8, to: 8}; "Grade 6-8" -> {from: 6, to: 8}; anything else null. */
export function parseGradeRange(
  grade: string | null | undefined,
): { from: number; to: number } | null {
  if (!grade) return null;

  const match = /^\s*Grade\s+(\d{1,2})(?:\s*-\s*(?:Grade\s+)?(\d{1,2}))?\s*$/i.exec(grade);
  if (!match) return null;

  const from = Number(match[1]);
  const to = match[2] ? Number(match[2]) : from;

  if (from < MIN_GRADE || to > MAX_GRADE || from > to) return null;

  return { from, to };
}

/** Canonical stored form: "Grade 8" or "Grade 6-8". Null when invalid. */
export function formatGradeRange(from: number, to: number): string | null {
  if (from < MIN_GRADE || to > MAX_GRADE || from > to) return null;

  return from === to ? `Grade ${from}` : `Grade ${from}-${to}`;
}

/**
 * The platform hourly rate for a grade (or grade range) / IITian flag.
 * Null when neither a recognised grade nor the IITian flag is set.
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

/**
 * Per-session standard price for a lecture of `durationMinutes`
 * (hourly rate x minutes / 60, whole rupees). Null when there is no
 * standard rate.
 */
export function getStandardSessionPrice(
  grade: string | null | undefined,
  isIITian: boolean,
  durationMinutes: number,
): number | null {
  const hourly = getStandardPrice(grade, isIITian);
  if (hourly == null) return null;

  return Math.round((hourly * durationMinutes) / 60);
}
