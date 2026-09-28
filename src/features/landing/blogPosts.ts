export interface BlogPost {
  slug: string;
  title: string;
  tag: string;
  /** ISO date (UTC), e.g. "2026-02-25". */
  date: string;
  excerpt: string;
  /** Full article. External for now — no in-app article pages yet. */
  url: string;
}

// DEMO DATA: the latest articles from https://learniee.com/blog/ so the blog
// page is not empty. Replace with a CMS / database source when in-app
// articles exist, and point `url` at the internal route.
export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "public-speaking-classes-for-students",
    title:
      "Public Speaking Classes for Students: Benefits, Age Guide & How to Choose (2026 Guide)",
    tag: "Public speaking",
    date: "2026-02-25",
    excerpt:
      "How public speaking classes build a child's confidence, the right age to start, and how to pick one.",
    url: "https://learniee.com/public-speaking-classes-for-students/",
  },
  {
    slug: "logical-reasoning-classes-for-students",
    title:
      "Logical Reasoning Classes for Students: Benefits, Syllabus & How to Start (2026 Guide)",
    tag: "Logical reasoning",
    date: "2026-02-25",
    excerpt:
      "Why reasoning skills matter for Olympiads and competitive exams, and what a typical syllabus covers.",
    url: "https://learniee.com/logical-reasoning-classes-for-students/",
  },
  {
    slug: "coding-classes-for-students",
    title: "Coding Classes for Students: Benefits, Age Guide & How to Start (2026)",
    tag: "Coding",
    date: "2026-02-25",
    excerpt:
      "Is coding really necessary or just a trend? What children gain from it and when to begin.",
    url: "https://learniee.com/coding-classes-for-students/",
  },
  {
    slug: "online-tutoring-vs-home-tuition",
    title: "Online Tutoring vs Home Tuition: What's Better for Your Child?",
    tag: "Online tutoring",
    date: "2026-02-23",
    excerpt:
      "A parent's comparison of online tutoring and home tuition to help you make the right call.",
    url: "https://learniee.com/online-tutoring-vs-home-tuition/",
  },
  {
    slug: "daily-study-routine",
    title: "Best Daily Study Routine for School Students (2026 Guide)",
    tag: "Study habits",
    date: "2026-02-23",
    excerpt:
      "A practical daily routine for students who struggle with focus or slipping grades.",
    url: "https://learniee.com/daily-study-routine/",
  },
  {
    slug: "extra-academic-support",
    title: "Signs Your Child Needs Extra Academic Support (Parent Guide 2026)",
    tag: "Parenting",
    date: "2026-02-21",
    excerpt:
      "Exam anxiety, avoided homework, falling grades: the warning signs and what to do next.",
    url: "https://learniee.com/extra-academic-support/",
  },
  {
    slug: "best-language-classes-for-students",
    title: "Best Language Classes for Students: How to Choose the Right One (2026 Guide)",
    tag: "Languages",
    date: "2026-02-21",
    excerpt:
      "What to look for in a language class if you're thinking about your child's future.",
    url: "https://learniee.com/best-language-classes-for-students/",
  },
];

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatPostDate(iso: string): string {
  return dateFormat.format(new Date(`${iso}T00:00:00Z`));
}
