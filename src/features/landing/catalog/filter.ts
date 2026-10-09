import { parseCourseGrade, type CatalogFilter } from "./pages";

/** The Course columns the public pages filter on. */
export interface FilterableCourse {
  subject: string | null;
  courseTitle: string | null;
  courseTags: string | null;
  category: string | null;
  grade: string | null;
  board: string | null;
  type: string | null;
}

const regexCache = new Map<string, RegExp>();

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Whole-word, case-insensitive; allows a plural "s"/"es" ("maths", "olympiads"). */
function wordRegex(keyword: string): RegExp {
  const key = keyword.toLowerCase();
  let re = regexCache.get(key);
  if (!re) {
    re = new RegExp(`(^|[^a-z0-9])${escapeRegex(key)}(es|s)?([^a-z0-9]|$)`, "i");
    regexCache.set(key, re);
  }
  return re;
}

function haystack(course: FilterableCourse): string {
  return [course.subject, course.courseTitle, course.courseTags, course.category]
    .filter(Boolean)
    .join(" | ");
}

export function matchesKeywords(course: FilterableCourse, keywords: string[]): boolean {
  const text = haystack(course);
  if (!text) return false;
  return keywords.some((k) => wordRegex(k).test(text));
}

/** True when the course satisfies every condition set on the filter. */
export function matchesFilter(course: FilterableCourse, filter: CatalogFilter): boolean {
  if (filter.type) {
    if (!course.type?.toLowerCase().startsWith(filter.type)) return false;
  }

  if (filter.boardKey) {
    const board = course.board?.toLowerCase().trim() ?? "";
    const ok = filter.boardKey === "state" ? board.startsWith("state") : board === filter.boardKey;
    if (!ok) return false;
  }

  if (filter.grades) {
    const range = parseCourseGrade(course.grade);
    if (!range || range.to < filter.grades.from || range.from > filter.grades.to) return false;
  }

  if (filter.keywords && !matchesKeywords(course, filter.keywords)) return false;

  return true;
}

/** Free-text search (the `?q=` box): every word must appear somewhere in the course. */
export function matchesQuery(course: FilterableCourse, query: string): boolean {
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);
  if (words.length === 0) return true;

  const text = `${haystack(course)} | ${course.grade ?? ""} | ${course.board ?? ""} | ${course.type ?? ""}`.toLowerCase();
  return words.every((w) => text.includes(w));
}
