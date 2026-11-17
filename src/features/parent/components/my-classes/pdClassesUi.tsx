import type { CSSProperties } from "react";

import type { HomeKid } from "@/features/parent/components/home/homeTypes";
import { SUBJECT_COLOR, kidColor } from "@/features/parent/components/home/homeLogic";
import { parseGradeNumber } from "@/features/courses/utils/coursePricing";
import type { StudentProfile } from "@/features/parent/types/student";

/** Glyph shown on a class row, per subject (design: ∑ Aa Fe Φ Bio अ </>). */
const SUBJECT_GLYPH: Record<string, string> = {
  Mathematics: "∑",
  English: "Aa",
  Chemistry: "Fe",
  Physics: "Φ",
  Biology: "Bio",
  Hindi: "अ",
  "Computer Science": "</>",
};

export function subjectTheme(subject: string | null | undefined): { color: string; glyph: string } {
  const s = (subject ?? "").trim();

  return {
    color: SUBJECT_COLOR[s] ?? "#5931a2",
    glyph: SUBJECT_GLYPH[s] ?? (s ? s[0].toUpperCase() : "?"),
  };
}

/** Learners for the switcher, built from the parent's student profiles. */
export function toHomeKids(students: StudentProfile[]): HomeKid[] {
  return students.map((s) => {
    const name = s.visibleName?.trim() || `${s.firstName} ${s.lastName}`.trim();

    return {
      id: s.id,
      name,
      first: name.split(/\s+/)[0] || name,
      grade: parseGradeNumber(s.standard),
    };
  });
}

export { kidColor };

export const firstWord = (name: string) => name.trim().split(/\s+/)[0] || name;

/**
 * Rounded subject glyph (design: `.cglyph`). Colour comes from the subject unless
 * overridden; position it with `className` (e.g. absolutely inside a row).
 */
export function SubjectGlyph({
  subject,
  color,
  className = "",
}: {
  subject: string | null | undefined;
  color?: string;
  className?: string;
}) {
  const theme = subjectTheme(subject);

  return (
    <span
      aria-hidden="true"
      style={{ "--sc": color ?? theme.color } as CSSProperties}
      className={`grid size-10 shrink-0 place-items-center rounded-xl bg-(--sc) text-[15px] font-bold tracking-[-0.02em] text-white ${className}`}
    >
      {theme.glyph}
    </span>
  );
}
