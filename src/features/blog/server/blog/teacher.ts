import { logActivity } from "@/features/shared/server/activityLog.service";
import {
    notifyBlogSubmitted
} from "@/features/shared/server/notificationTriggers.service";
import { prisma } from "@/lib/prisma";
import { BlogPostStatus } from "@prisma/client";
import "server-only";
import {
    readingMinutes,
    validateDraft,
    validateForSubmit,
    type BlogDraftInput
} from "../../utils/blogRules";
import { BlogError, EDITABLE, findFreeSlug, isUniqueViolation, ownedPost, parseInput, requireApprovedTeacher, revalidateBlogPaths, teacherPostSelect } from './base';

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
