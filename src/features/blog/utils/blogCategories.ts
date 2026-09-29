/**
 * Fixed blog categories. `slug` is what `BlogPost.category` stores and
 * what the public category URL uses (/blog/category/<slug>); a fixed
 * list keeps category pages consistent (free text would fragment them
 * into near-duplicate thin pages, which hurts SEO).
 */
export interface BlogCategory {
  slug: string;
  label: string;
  /** Used as the category page's intro + meta description. */
  description: string;
}

export const BLOG_CATEGORIES: readonly BlogCategory[] = [
  {
    slug: "study-habits",
    label: "Study habits",
    description:
      "Practical routines, focus techniques and study habits that help school students learn better and stress less.",
  },
  {
    slug: "exam-preparation",
    label: "Exam preparation",
    description:
      "Exam preparation guides for parents and students: revision plans, Olympiads, board exams and competitive tests.",
  },
  {
    slug: "parenting",
    label: "Parenting",
    description:
      "Parenting advice on supporting your child's learning, spotting when they need help and building confidence.",
  },
  {
    slug: "online-learning",
    label: "Online learning",
    description:
      "How online tuition works, how to choose a good online teacher and how to get the most from live classes.",
  },
  {
    slug: "maths-and-science",
    label: "Maths & science",
    description:
      "Tips, explainers and learning strategies for school maths and science, from early primary to senior classes.",
  },
  {
    slug: "languages",
    label: "Languages",
    description:
      "Guides to learning English, Hindi and other languages: when to start, how to choose classes and how to practise.",
  },
  {
    slug: "coding-and-tech",
    label: "Coding & tech",
    description:
      "Coding and technology for kids: what to learn, the right age to start and how to pick a class.",
  },
  {
    slug: "creative-skills",
    label: "Creative skills",
    description:
      "Public speaking, music, art and other creative skills that build confidence beyond the school syllabus.",
  },
];

export function getBlogCategory(slug: string): BlogCategory | undefined {
  return BLOG_CATEGORIES.find((c) => c.slug === slug);
}

export function blogCategoryLabel(slug: string): string {
  return getBlogCategory(slug)?.label ?? slug;
}
