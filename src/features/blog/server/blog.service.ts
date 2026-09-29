import "server-only";

import { revalidatePath } from "next/cache";
import { BlogPostStatus, Prisma, TeacherApprovalStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { logActivity } from "@/features/shared/server/activityLog.service";
import {
  notifyBlogReviewed,
  notifyBlogSubmitted,
} from "@/features/shared/server/notificationTriggers.service";
import {
  normalizeTags,
  readingMinutes,
  slugifyTitle,
  validateDraft,
  validateForSubmit,
  type BlogDraftInput,
} from "../utils/blogRules";

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

const EDITABLE: BlogPostStatus[] = [BlogPostStatus.DRAFT, BlogPostStatus.REJECTED];

const teacherPostSelect = {
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

function parseInput(raw: Partial<BlogDraftInput>): BlogDraftInput {
  return {
    title: typeof raw.title === "string" ? raw.title.trim() : "",
    excerpt: typeof raw.excerpt === "string" ? raw.excerpt.trim() : "",
    content: typeof raw.content === "string" ? raw.content.replace(/\r\n?/g, "\n") : "",
    category: typeof raw.category === "string" ? raw.category : "",
    tags: normalizeTags(raw.tags),
  };
}

async function requireApprovedTeacher(teacherId: string) {
  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { approvalStatus: true },
  });

  if (!teacher) throw new BlogError("Teacher not found.", 404);

  if (teacher.approvalStatus !== TeacherApprovalStatus.APPROVED) {
    throw new BlogError("Only approved teachers can write blog posts.", 403);
  }
}

async function findFreeSlug(title: string, excludeId?: string): Promise<string> {
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

function isUniqueViolation(err: unknown) {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

async function ownedPost(teacherId: string, postId: string) {
  const post = await prisma.blogPost.findFirst({
    where: { id: postId, teacherId },
    select: teacherPostSelect,
  });

  if (!post) throw new BlogError("Blog post not found.", 404);

  return post;
}

// ---------------------------------------------------------------------------
// Teacher
// ---------------------------------------------------------------------------

export function listTeacherPosts(teacherId: string) {
  return prisma.blogPost.findMany({
    where: { teacherId },
    orderBy: { updatedAt: "desc" },
    select: { ...teacherPostSelect, content: false },
  });
}

export function getTeacherPost(teacherId: string, postId: string) {
  return ownedPost(teacherId, postId);
}

export async function createTeacherPost(teacherId: string, raw: Partial<BlogDraftInput>) {
  await requireApprovedTeacher(teacherId);

  const input = parseInput(raw);
  const errors = validateDraft(input);
  if (errors.length) throw new BlogError(errors.join(" "), 400);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.blogPost.create({
        data: {
          teacherId,
          slug: await findFreeSlug(input.title),
          title: input.title,
          excerpt: input.excerpt,
          content: input.content,
          category: input.category,
          tags: input.tags,
          readingMinutes: readingMinutes(input.content),
        },
        select: teacherPostSelect,
      });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
    }
  }

  throw new BlogError("Couldn't create a unique link for this post. Try a different title.", 409);
}

export async function updateTeacherPost(
  teacherId: string,
  postId: string,
  raw: Partial<BlogDraftInput>,
) {
  const existing = await ownedPost(teacherId, postId);

  if (!EDITABLE.includes(existing.status)) {
    throw new BlogError(
      existing.status === "PUBLISHED"
        ? "Unpublish this post before editing it."
        : "Withdraw this post from review before editing it.",
      409,
    );
  }

  const input = parseInput(raw);
  const errors = validateDraft(input);
  if (errors.length) throw new BlogError(errors.join(" "), 400);

  // A live URL must never change: the slug follows the title only until first publish.
  const retitle = !existing.publishedAt && input.title !== existing.title;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await prisma.blogPost.updateMany({
        where: { id: postId, teacherId, status: { in: EDITABLE } },
        data: {
          title: input.title,
          excerpt: input.excerpt,
          content: input.content,
          category: input.category,
          tags: input.tags,
          readingMinutes: readingMinutes(input.content),
          ...(retitle ? { slug: await findFreeSlug(input.title, postId) } : {}),
        },
      });

      if (result.count === 0) {
        throw new BlogError("This post can no longer be edited.", 409);
      }

      return ownedPost(teacherId, postId);
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
    }
  }

  throw new BlogError("Couldn't create a unique link for this post. Try a different title.", 409);
}

export type TeacherStatusAction = "submit" | "withdraw" | "unpublish";

export async function changeTeacherPostStatus(
  teacherId: string,
  postId: string,
  action: TeacherStatusAction,
) {
  const existing = await ownedPost(teacherId, postId);

  if (action === "submit") {
    await requireApprovedTeacher(teacherId);

    const errors = validateForSubmit({
      title: existing.title,
      excerpt: existing.excerpt,
      content: existing.content,
      category: existing.category,
      tags: existing.tags,
    });
    if (errors.length) throw new BlogError(errors.join(" "), 400);

    const result = await prisma.blogPost.updateMany({
      where: { id: postId, teacherId, status: { in: EDITABLE } },
      data: {
        status: BlogPostStatus.PENDING_REVIEW,
        submittedAt: new Date(),
        rejectionReason: null,
      },
    });
    if (result.count === 0) throw new BlogError("This post can't be submitted right now.", 409);

    await notifyBlogSubmitted(postId);
    await logActivity({
      action: "BLOG_SUBMITTED",
      actorRole: "TEACHER",
      actorId: teacherId,
      description: `Blog post "${existing.title}" submitted for review.`,
      metadata: { postId, slug: existing.slug },
    });
  } else if (action === "withdraw") {
    const result = await prisma.blogPost.updateMany({
      where: { id: postId, teacherId, status: BlogPostStatus.PENDING_REVIEW },
      data: { status: BlogPostStatus.DRAFT },
    });
    if (result.count === 0) throw new BlogError("This post isn't awaiting review.", 409);
  } else if (action === "unpublish") {
    const result = await prisma.blogPost.updateMany({
      where: { id: postId, teacherId, status: BlogPostStatus.PUBLISHED },
      data: { status: BlogPostStatus.DRAFT },
    });
    if (result.count === 0) throw new BlogError("This post isn't published.", 409);

    revalidateBlogPaths(existing.slug, existing.category);
  } else {
    throw new BlogError("Unknown action.", 400);
  }

  return ownedPost(teacherId, postId);
}

export async function deleteTeacherPost(teacherId: string, postId: string) {
  const existing = await ownedPost(teacherId, postId);

  if (existing.status === "PUBLISHED") {
    throw new BlogError("Unpublish this post before deleting it.", 409);
  }

  await prisma.blogPost.deleteMany({
    where: { id: postId, teacherId, status: { not: BlogPostStatus.PUBLISHED } },
  });
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

const adminPostSelect = {
  ...teacherPostSelect,
  teacher: {
    select: { id: true, firstName: true, lastName: true, visibleName: true, email: true },
  },
} satisfies Prisma.BlogPostSelect;

export function listAdminPosts(status?: BlogPostStatus) {
  return prisma.blogPost.findMany({
    where: status ? { status } : undefined,
    orderBy: [{ submittedAt: "desc" }, { updatedAt: "desc" }],
    select: { ...adminPostSelect, content: false },
    take: 200,
  });
}

export async function getAdminPost(postId: string) {
  const post = await prisma.blogPost.findUnique({
    where: { id: postId },
    select: adminPostSelect,
  });

  if (!post) throw new BlogError("Blog post not found.", 404);

  return post;
}

export async function approveBlogPost(postId: string, actor: BlogActor) {
  const post = await getAdminPost(postId);
  const now = new Date();

  const result = await prisma.blogPost.updateMany({
    where: { id: postId, status: BlogPostStatus.PENDING_REVIEW },
    data: {
      status: BlogPostStatus.PUBLISHED,
      // First approval only — a republished post keeps its original date.
      publishedAt: post.publishedAt ?? now,
      reviewedAt: now,
      reviewedBySub: actor.sub,
      rejectionReason: null,
    },
  });
  if (result.count === 0) throw new BlogError("This post isn't awaiting review.", 409);

  revalidateBlogPaths(post.slug, post.category);
  await notifyBlogReviewed(postId, true);
  await logActivity({
    action: "BLOG_PUBLISHED",
    actorRole: "ADMIN",
    actorId: actor.sub,
    actorName: actor.name ?? null,
    actorEmail: actor.email ?? null,
    description: `Blog post "${post.title}" published.`,
    metadata: { postId, slug: post.slug, teacherId: post.teacher.id },
  });

  return getAdminPost(postId);
}

/** Reject a pending post, or take a live one down. Reason is mandatory. */
export async function rejectBlogPost(postId: string, reason: unknown, actor: BlogActor) {
  const cleaned = typeof reason === "string" ? reason.trim() : "";
  if (cleaned.length < 5 || cleaned.length > 500) {
    throw new BlogError("Give the teacher a reason (5 to 500 characters).", 400);
  }

  const post = await getAdminPost(postId);

  const result = await prisma.blogPost.updateMany({
    where: {
      id: postId,
      status: { in: [BlogPostStatus.PENDING_REVIEW, BlogPostStatus.PUBLISHED] },
    },
    data: {
      status: BlogPostStatus.REJECTED,
      reviewedAt: new Date(),
      reviewedBySub: actor.sub,
      rejectionReason: cleaned,
    },
  });
  if (result.count === 0) throw new BlogError("This post can't be rejected right now.", 409);

  revalidateBlogPaths(post.slug, post.category);
  await notifyBlogReviewed(postId, false);
  await logActivity({
    action: "BLOG_REJECTED",
    actorRole: "ADMIN",
    actorId: actor.sub,
    actorName: actor.name ?? null,
    actorEmail: actor.email ?? null,
    description: `Blog post "${post.title}" ${post.status === "PUBLISHED" ? "taken down" : "rejected"}.`,
    metadata: { postId, slug: post.slug, teacherId: post.teacher.id, reason: cleaned },
  });

  return getAdminPost(postId);
}
