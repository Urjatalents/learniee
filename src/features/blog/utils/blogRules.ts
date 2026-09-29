/**
 * Validation + text helpers shared by the Teacher editor (client) and
 * the API/service (server) so both enforce identical limits.
 */
import { getBlogCategory } from "./blogCategories";
import { blocksToText, parseMarkdown, type Block } from "./markdown";

export const BLOG_LIMITS = {
  titleMin: 15,
  /** Hard cap. Search engines truncate around 60 chars — the editor shows a recommendation. */
  titleMax: 100,
  titleRecommended: 60,
  excerptMin: 80,
  excerptMax: 180,
  excerptRecommendedMax: 160,
  contentMaxChars: 40_000,
  /** Thin content ranks poorly — required to submit for review (drafts may be shorter). */
  submitMinWords: 300,
  maxTags: 5,
  tagMaxChars: 30,
} as const;

/** Slugs that would collide with static /blog/* routes. */
export const RESERVED_BLOG_SLUGS = new Set(["category", "page", "feed", "feed.xml"]);

export function slugifyTitle(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");

  if (!base) return "post";

  return RESERVED_BLOG_SLUGS.has(base) ? `${base}-post` : base;
}

/** Word count of already-parsed blocks: link text counts, URLs, image paths and markup do not. */
export function countBlockWords(blocks: Block[]): number {
  const text = blocksToText(blocks).trim();

  return text ? text.split(/\s+/).length : 0;
}

/** Word count over the visible text — counted from the parsed article, so it matches what readers see. */
export function countWords(markdown: string): number {
  return countBlockWords(parseMarkdown(markdown).blocks);
}

export function readingMinutes(markdown: string): number {
  return Math.max(1, Math.ceil(countWords(markdown) / 200));
}

export function normalizeTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];

  const seen = new Set<string>();

  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const tag = raw.trim().toLowerCase().replace(/\s+/g, " ").slice(0, BLOG_LIMITS.tagMaxChars);
    if (tag) seen.add(tag);
    if (seen.size >= BLOG_LIMITS.maxTags) break;
  }

  return [...seen];
}

export interface BlogDraftInput {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
}

/** Errors that block even saving a draft. Empty array = OK. */
export function validateDraft(input: BlogDraftInput): string[] {
  const errors: string[] = [];
  const title = input.title.trim();

  if (title.length < BLOG_LIMITS.titleMin) {
    errors.push(`Title must be at least ${BLOG_LIMITS.titleMin} characters.`);
  }
  if (title.length > BLOG_LIMITS.titleMax) {
    errors.push(`Title must be at most ${BLOG_LIMITS.titleMax} characters.`);
  }
  if (!getBlogCategory(input.category)) {
    errors.push("Pick a category.");
  }
  if (input.excerpt.trim().length > BLOG_LIMITS.excerptMax) {
    errors.push(`Summary must be at most ${BLOG_LIMITS.excerptMax} characters.`);
  }
  if (input.content.length > BLOG_LIMITS.contentMaxChars) {
    errors.push("The article is too long.");
  }

  return errors;
}

/** Extra requirements to submit for Admin review (on top of validateDraft). */
export function validateForSubmit(input: BlogDraftInput): string[] {
  const errors = validateDraft(input);
  const excerpt = input.excerpt.trim();

  if (excerpt.length < BLOG_LIMITS.excerptMin) {
    errors.push(`Summary must be at least ${BLOG_LIMITS.excerptMin} characters.`);
  }
  if (countWords(input.content) < BLOG_LIMITS.submitMinWords) {
    errors.push(`The article needs at least ${BLOG_LIMITS.submitMinWords} words before you submit it.`);
  }

  return errors;
}
