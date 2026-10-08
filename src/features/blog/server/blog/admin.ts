import { logActivity } from "@/features/shared/server/activityLog.service";
import {
    notifyBlogReviewed
} from "@/features/shared/server/notificationTriggers.service";
import { prisma } from "@/lib/prisma";
import { BlogPostStatus, Prisma } from "@prisma/client";
import "server-only";
import { BlogActor, BlogError, revalidateBlogPaths, teacherPostSelect } from './base';

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
