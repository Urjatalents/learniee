/**
 * Public class-listing pages linked from the landing footer
 * ("Browse classes" and "Counselling"). One config drives every page:
 *
 *   /courses                      all classes (+ ?q= search)
 *   /courses/1-to-1-tutoring      format
 *   /courses/group-classes        format
 *   /courses/<subject>            subject / "more to explore"
 *   /courses/age/<n>-year-olds    age
 *   /courses/grade/<n>th-grade    grade ("prep" = ages 3-5)
 *   /courses/board/<board>        board
 *   /courses/language/<language>  language
 *   /counselling/<topic>          counselling topic
 *
 * Pure data + pure functions (no DB, no React) so it is usable from the
 * pages, the sitemap and tests. The slugs MUST stay in sync with the
 * footer links in `../data.ts` (FOOTER_GROUPS).
 */

export type CatalogKind =
  | "format"
  | "subject"
  | "age"
  | "grade"
  | "board"
  | "language"
  | "counselling";

export interface CatalogFilter {
  /** Course.type — "Individual" | "Group". */
  type?: "individual" | "group";
  /** Whole-word keywords matched against subject / title / tags / category. */
  keywords?: string[];
  /** Matches when the course's grade range overlaps this range. */
  grades?: { from: number; to: number };
  /** Matches by `keywords` only (pre-school has no numeric grade). */
  boardKey?: string;
}

export interface CatalogPage {
  kind: CatalogKind;
  slug: string;
  /** Label as shown in the footer / breadcrumb / chips. */
  label: string;
  heading: string;
  intro: string;
  filter: CatalogFilter;
  /** Values prefilled into the "Request a class" form. */
  request: { title: string; subject?: string; grade?: string; board?: string };
}

const KIND_ROOT: Record<CatalogKind, { label: string; href?: string }> = {
  format: { label: "Classes", href: "/courses" },
  subject: { label: "Classes", href: "/courses" },
  age: { label: "Classes", href: "/courses" },
  grade: { label: "Classes", href: "/courses" },
  board: { label: "Classes", href: "/courses" },
  language: { label: "Classes", href: "/courses" },
  // No /counselling index page yet, so the breadcrumb shows it unlinked.
  counselling: { label: "Counselling" },
};

export function catalogHref(page: Pick<CatalogPage, "kind" | "slug">): string {
  switch (page.kind) {
    case "format":
    case "subject":
      return `/courses/${page.slug}`;
    case "counselling":
      return `/counselling/${page.slug}`;
    default:
      return `/courses/${page.kind}/${page.slug}`;
  }
}

export function catalogRoot(kind: CatalogKind) {
  return KIND_ROOT[kind];
}

// --- format -----------------------------------------------------------------

const FORMAT_PAGES: CatalogPage[] = [
  {
    kind: "format",
    slug: "1-to-1-tutoring",
    label: "1-to-1 tutoring",
    heading: "1-to-1 Tutoring",
    intro: "Live one-to-one classes where the teacher's attention is entirely on your child.",
    filter: { type: "individual" },
    request: { title: "1-to-1 tutoring" },
  },
  {
    kind: "format",
    slug: "group-classes",
    label: "Group classes",
    heading: "Group Classes",
    intro: "Small live groups: learn alongside other children at a lower price per class.",
    filter: { type: "group" },
    request: { title: "Group class" },
  },
];

// --- subjects ----------------------------------------------------------------

interface SubjectDef {
  slug: string;
  label: string;
  keywords: string[];
}

const SUBJECTS: SubjectDef[] = [
  { slug: "maths", label: "Maths", keywords: ["math", "maths", "mathematics", "arithmetic", "algebra", "geometry"] },
  { slug: "science", label: "Science", keywords: ["science", "physics", "chemistry", "biology"] },
  { slug: "english", label: "English", keywords: ["english", "grammar", "spoken english", "creative writing"] },
  { slug: "hindi", label: "Hindi", keywords: ["hindi"] },
  { slug: "social-studies", label: "Social Studies", keywords: ["social studies", "social science", "civics", "geography", "history", "economics"] },
  { slug: "history", label: "History", keywords: ["history"] },
  { slug: "coding", label: "Coding", keywords: ["coding", "programming", "python", "java", "javascript", "scratch", "html", "web development"] },
  { slug: "vedic-maths", label: "Vedic Maths", keywords: ["vedic"] },
  { slug: "abacus", label: "Abacus", keywords: ["abacus"] },
  { slug: "phonics", label: "Phonics", keywords: ["phonics"] },
  { slug: "art", label: "Art", keywords: ["art", "drawing", "painting", "sketching", "doodle", "craft"] },
  { slug: "music", label: "Music", keywords: ["music", "keyboard", "piano", "guitar", "singing", "vocal", "violin", "tabla"] },
  { slug: "dance", label: "Dance", keywords: ["dance", "bharatanatyam", "kathak", "zumba"] },
  { slug: "photography", label: "Photography", keywords: ["photography"] },
  { slug: "public-speaking", label: "Public Speaking", keywords: ["public speaking", "debate", "elocution"] },
  { slug: "personality-development", label: "Personality Development", keywords: ["personality", "soft skills", "communication skills"] },
  { slug: "python", label: "Python", keywords: ["python"] },
  { slug: "robotics", label: "Robotics", keywords: ["robotics", "arduino"] },
  { slug: "graphic-design", label: "Graphic Design", keywords: ["graphic design", "photoshop", "canva", "illustrator"] },
  { slug: "artificial-intelligence", label: "Artificial Intelligence", keywords: ["artificial intelligence", "ai", "machine learning"] },
  { slug: "game-development", label: "Game Development", keywords: ["game development", "game design", "unity", "roblox"] },
  { slug: "digital-marketing", label: "Digital Marketing", keywords: ["digital marketing", "seo", "social media"] },
  { slug: "life-skills", label: "Life Skills", keywords: ["life skills", "financial literacy"] },
  { slug: "logical-reasoning", label: "Logical Reasoning", keywords: ["logical reasoning", "reasoning", "aptitude", "puzzles"] },
  { slug: "general-knowledge", label: "General Knowledge", keywords: ["general knowledge", "gk", "current affairs"] },
  { slug: "olympiads", label: "Olympiads", keywords: ["olympiad", "olympiads"] },
  { slug: "jee", label: "JEE", keywords: ["jee", "iit"] },
  { slug: "neet", label: "NEET", keywords: ["neet"] },
  { slug: "gre", label: "GRE", keywords: ["gre"] },
  { slug: "gmat", label: "GMAT", keywords: ["gmat"] },
];

const SUBJECT_PAGES: CatalogPage[] = SUBJECTS.map((s) => ({
  kind: "subject",
  slug: s.slug,
  label: s.label,
  heading: `${s.label} Classes`,
  intro: `Live online ${s.label} classes for children and teens, taught by hand-picked teachers.`,
  filter: { keywords: s.keywords },
  request: { title: `${s.label} classes`, subject: s.label },
}));

// --- age / grade ---------------------------------------------------------------

const MIN_AGE = 3;
const MAX_AGE = 18;

/**
 * Age -> school grade, assuming Grade 1 starts at age 6 (Indian school
 * year). Ages 3-5 are pre-school ("prep", no numeric grade); 18 maps to
 * Grade 12. Revisit if the platform adopts a different age/grade rule.
 */
function gradeForAge(age: number): number | null {
  if (age < 6) return null;
  return Math.min(age - 5, 12);
}

const PREP_KEYWORDS = ["prep", "nursery", "kindergarten", "kg", "preschool", "pre-school", "phonics", "rhymes"];

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

const AGE_PAGES: CatalogPage[] = Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => {
  const age = MIN_AGE + i;
  const grade = gradeForAge(age);
  return {
    kind: "age" as const,
    slug: `${age}-year-olds`,
    label: `${age} Year Olds`,
    heading: `Classes for ${age} Year Olds`,
    intro: `Live online classes that suit ${age} year olds: patient teachers, short engaging sessions and two free demos to begin.`,
    filter: grade ? { grades: { from: grade, to: grade } } : { keywords: PREP_KEYWORDS },
    request: {
      title: `Class for a ${age} year old`,
      grade: grade ? `Grade ${grade}` : undefined,
    },
  };
});

const GRADE_PAGES: CatalogPage[] = [
  {
    kind: "grade",
    slug: "prep",
    label: "Prep",
    heading: "Classes for Prep (Ages 3 to 5)",
    intro: "Playful early-learning classes for pre-schoolers: phonics, numbers, stories and creative play.",
    filter: { keywords: PREP_KEYWORDS },
    request: { title: "Prep class" },
  },
  ...Array.from({ length: 12 }, (_, i) => {
    const g = i + 1;
    const label = `${ordinal(g)} Grade`;
    return {
      kind: "grade" as const,
      slug: `${ordinal(g)}-grade`,
      label,
      heading: `Classes for ${label}`,
      intro: `School subjects and extra classes for ${label} students, with live teachers and homework feedback.`,
      filter: { grades: { from: g, to: g } },
      request: { title: `${label} class`, grade: `Grade ${g}` },
    };
  }),
];

// --- board / language ------------------------------------------------------------

const BOARD_PAGES: CatalogPage[] = [
  { slug: "cbse", label: "CBSE", key: "cbse" },
  { slug: "icse", label: "ICSE", key: "icse" },
  { slug: "igcse", label: "IGCSE", key: "igcse" },
  { slug: "ib", label: "IB", key: "ib" },
  { slug: "state-boards", label: "State Boards", key: "state" },
].map((b) => ({
  kind: "board" as const,
  slug: b.slug,
  label: b.label,
  heading: `${b.label} Classes`,
  intro: `Live online classes aligned to the ${b.label} syllabus, from teachers who know the exam pattern.`,
  filter: { boardKey: b.key },
  request: {
    title: `${b.label} class`,
    // Only values the Request form's Board select accepts.
    board: b.slug === "state-boards" ? "State Board" : b.label,
  },
}));

const LANGUAGES: { slug: string; label: string; keywords: string[] }[] = [
  { slug: "english", label: "English", keywords: ["english", "spoken english", "grammar"] },
  { slug: "hindi", label: "Hindi", keywords: ["hindi"] },
  { slug: "marathi", label: "Marathi", keywords: ["marathi"] },
  { slug: "french", label: "French", keywords: ["french"] },
  { slug: "spanish", label: "Spanish", keywords: ["spanish"] },
  { slug: "mandarin", label: "Mandarin", keywords: ["mandarin", "chinese"] },
];

const LANGUAGE_PAGES: CatalogPage[] = LANGUAGES.map((l) => ({
  kind: "language",
  slug: l.slug,
  label: l.label,
  heading: `Learn ${l.label}`,
  intro: `Live ${l.label} classes for every level, with speaking practice from the first session.`,
  filter: { keywords: l.keywords },
  request: { title: `${l.label} language class`, subject: l.label },
}));

// --- counselling -----------------------------------------------------------------

const COUNSELLING: { slug: string; label: string; keywords: string[]; blurb: string }[] = [
  {
    slug: "career",
    label: "Career",
    keywords: ["career counselling", "career counseling", "career guidance"],
    blurb: "Stream, subject and career choices explained by experienced counsellors.",
  },
  {
    slug: "behavioural",
    label: "Behavioural",
    keywords: ["behavioural", "behavioral", "behaviour", "behavior", "parenting"],
    blurb: "Gentle, practical support for focus, confidence and everyday behaviour.",
  },
  {
    slug: "school",
    label: "School",
    keywords: ["school counselling", "school counseling", "school guidance"],
    blurb: "Help with school transitions, peer issues and building a good study routine.",
  },
  {
    slug: "examinations",
    label: "Examinations",
    keywords: ["exam stress", "exam counselling", "exam counseling", "exam anxiety", "examination"],
    blurb: "Strategies for exam stress, planning and staying calm on the day.",
  },
];

const COUNSELLING_PAGES: CatalogPage[] = COUNSELLING.map((c) => ({
  kind: "counselling",
  slug: c.slug,
  label: c.label,
  heading: `${c.label} Counselling`,
  intro: c.blurb,
  filter: { keywords: c.keywords },
  request: { title: `${c.label} counselling`, subject: `${c.label} counselling` },
}));

// --- lookup -----------------------------------------------------------------------

const PAGES_BY_KIND: Record<CatalogKind, CatalogPage[]> = {
  format: FORMAT_PAGES,
  subject: SUBJECT_PAGES,
  age: AGE_PAGES,
  grade: GRADE_PAGES,
  board: BOARD_PAGES,
  language: LANGUAGE_PAGES,
  counselling: COUNSELLING_PAGES,
};

export const ALL_CATALOG_PAGES: CatalogPage[] = Object.values(PAGES_BY_KIND).flat();

export function listCatalogPages(kind: CatalogKind): CatalogPage[] {
  return PAGES_BY_KIND[kind];
}

/** `/courses/<slug>` serves both formats and subjects. */
export function getCatalogPage(kind: CatalogKind, slug: string): CatalogPage | null {
  const wanted = slug.toLowerCase();
  return PAGES_BY_KIND[kind].find((p) => p.slug === wanted) ?? null;
}

export function getCoursesRootPage(slug: string): CatalogPage | null {
  return getCatalogPage("format", slug) ?? getCatalogPage("subject", slug);
}

// --- grade parsing for the matcher (kept here so filter.ts stays tiny) -----------------

/** "Grade 8" -> {8,8}; "Grade 6-8" -> {6,8}; anything else -> null. */
export function parseCourseGrade(grade: string | null | undefined): { from: number; to: number } | null {
  if (!grade) return null;
  const m = /^\s*Grade\s+(\d{1,2})(?:\s*-\s*(?:Grade\s+)?(\d{1,2}))?\s*$/i.exec(grade);
  if (!m) return null;
  const from = Number(m[1]);
  const to = m[2] ? Number(m[2]) : from;
  return { from: Math.min(from, to), to: Math.max(from, to) };
}
