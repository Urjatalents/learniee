import { prisma } from "@/lib/prisma";
import { BlogPostStatus, Prisma, TeacherApprovalStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import "server-only";
import {
    normalizeTags,
    slugifyTitle,
    type BlogDraftInput
} from "../../utils/blogRules";

/**
 * Public Blog (Sep 29, 2026) — Teacher authoring + Admin review.
 * Public reads live in blogPublic.service.ts.
 *
 * Lifecycle: DRAFT -> PENDING_REVIEW -> PUBLISHED | REJECTED.
 * Every status change is a conditional `updateMany` (where status in
 * the allowed "from" set), so repeated/concurrent clicks are harmless.
 */

export class BlogError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
export interface BlogActor {
  sub: string;
  name?: string | null;
  email?: string | null;
}
export const EDITABLE: BlogPostStatus[] = [BlogPostStatus.DRAFT, BlogPostStatus.REJECTED];
export const teacherPostSelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  content: true,
  category: true,
  tags: true,
  readingMinutes: true,
  status: true,
  submittedAt: true,
  publishedAt: true,
  reviewedAt: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BlogPostSelect;
// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Refreshes every public page a post can appear on. Never throws. */
export function revalidateBlogPaths(slug: string, category: string) {
  try {
    revalidatePath("/");
    revalidatePath("/blog");
    revalidatePath("/blog/page/[page]", "page");
    revalidatePath(`/blog/${slug}`);
    revalidatePath(`/blog/category/${category}`);
    revalidatePath("/blog/feed.xml");
    revalidatePath("/sitemap.xml");
  } catch (err) {
    console.error("Blog revalidation failed:", err);
  }
}
export function parseInput(raw: Partial<BlogDraftInput>): BlogDraftInput {
  return {
    title: typeof raw.title === "string" ? raw.title.trim() : "",
    excerpt: typeof raw.excerpt === "string" ? raw.excerpt.trim() : "",
    content: typeof raw.content === "string" ? raw.content.replace(/\r\n?/g, "\n") : "",
    category: typeof raw.category === "string" ? raw.category : "",
    tags: normalizeTags(raw.tags),
  };
}
export async function requireApprovedTeacher(teacherId: string) {
  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { approvalStatus: true },
  });

  if (!teacher) throw new BlogError("Teacher not found.", 404);

  if (teacher.approvalStatus !== TeacherApprovalStatus.APPROVED) {
    throw new BlogError("Only approved teachers can write blog posts.", 403);
  }
}
export async function findFreeSlug(title: string, excludeId?: string): Promise<string> {
  const base = slugifyTitle(title);

  for (let n = 1; n <= 50; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const existing = await prisma.blogPost.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existing || existing.id === excludeId) return candidate;
  }

  return `${base}-${Date.now().toString(36)}`;
}
export function isUniqueViolation(err: unknown) {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}
export async function ownedPost(teacherId: string, postId: string) {
  const post = await prisma.blogPost.findFirst({
    where: { id: postId, teacherId },
    select: teacherPostSelect,
  });

  if (!post) throw new BlogError("Blog post not found.", 404);

  return post;
}
