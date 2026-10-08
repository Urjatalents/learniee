import {
    createNotification,
    notifyAllAdmins
} from "@/features/shared/server/notification.service";
import { prisma } from "@/lib/prisma";
import "server-only";
import { R, T, displayName, safe } from './shared';

// ---------------------------------------------------------------------------
// Homework
// ---------------------------------------------------------------------------

export function notifyHomeworkAssigned(homeworkId: string) {
  return safe("homework assigned", async () => {
    const homework = await prisma.homework.findUnique({
      where: { id: homeworkId },
      select: {
        parentId: true,
        title: true,
        enrollment: { select: { course: { select: { courseTitle: true } } } },
      },
    });
    if (!homework) return;

    await createNotification({
      recipientId: homework.parentId,
      recipientRole: R.PARENT,
      type: T.HOMEWORK_ASSIGNED,
      title: "New homework assigned",
      message: `"${homework.title}" was assigned for ${homework.enrollment.course.courseTitle || "your course"}.`,
      link: "/parent/homework-tests",
    });
  });
}
/** Resource Library (Sep 24, 2026) — Parent is notified once when a Teacher shares a new resource. */
export function notifyResourceShared(resourceId: string) {
  return safe("resource shared", async () => {
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      select: {
        parentId: true,
        title: true,
        enrollment: { select: { course: { select: { courseTitle: true } } } },
      },
    });
    if (!resource) return;

    await createNotification({
      recipientId: resource.parentId,
      recipientRole: R.PARENT,
      type: T.RESOURCE_SHARED,
      title: "New resource shared",
      message: `"${resource.title}" was shared for ${resource.enrollment.course.courseTitle || "your course"}.`,
      link: "/parent/resources",
    });
  });
}
export function notifyHomeworkSubmitted(homeworkId: string) {
  return safe("homework submitted", async () => {
    const homework = await prisma.homework.findUnique({
      where: { id: homeworkId },
      select: {
        teacherId: true,
        title: true,
        student: { select: { firstName: true, visibleName: true } },
      },
    });
    if (!homework) return;

    const studentName = displayName({
      firstName: homework.student.firstName,
      visibleName: homework.student.visibleName,
    });

    await createNotification({
      recipientId: homework.teacherId,
      recipientRole: R.TEACHER,
      type: T.HOMEWORK_SUBMITTED,
      title: "Homework submitted",
      message: `${studentName} submitted "${homework.title}" — ready for review.`,
      link: "/teacher/hw-tests",
    });
  });
}
export function notifyHomeworkGraded(homeworkId: string) {
  return safe("homework graded", async () => {
    const homework = await prisma.homework.findUnique({
      where: { id: homeworkId },
      select: { parentId: true, title: true },
    });
    if (!homework) return;

    await createNotification({
      recipientId: homework.parentId,
      recipientRole: R.PARENT,
      type: T.HOMEWORK_GRADED,
      title: "Homework reviewed",
      message: `Your teacher reviewed "${homework.title}" and left feedback.`,
      link: "/parent/homework-tests",
    });
  });
}
/** Public Blog (Sep 29, 2026) — every Admin is told when a Teacher submits a post for review. */
export function notifyBlogSubmitted(postId: string) {
  return safe("blog submitted", async () => {
    const post = await prisma.blogPost.findUnique({
      where: { id: postId },
      select: {
        title: true,
        teacher: { select: { firstName: true, lastName: true, visibleName: true } },
      },
    });
    if (!post) return;

    await notifyAllAdmins({
      type: T.BLOG_SUBMITTED,
      title: "Blog post awaiting review",
      message: `${displayName(post.teacher)} submitted "${post.title}" for review.`,
      link: "/admin/blogs",
    });
  });
}
/** Public Blog — the Teacher hears the Admin's decision (published, or rejected/taken down with the reason). */
export function notifyBlogReviewed(postId: string, approved: boolean) {
  return safe("blog reviewed", async () => {
    const post = await prisma.blogPost.findUnique({
      where: { id: postId },
      select: { teacherId: true, title: true, rejectionReason: true },
    });
    if (!post) return;

    await createNotification({
      recipientId: post.teacherId,
      recipientRole: R.TEACHER,
      type: approved ? T.BLOG_PUBLISHED : T.BLOG_REJECTED,
      title: approved ? "Your blog post is live" : "Your blog post needs changes",
      message: approved
        ? `"${post.title}" was approved and is now published on the Learniee blog.`
        : `"${post.title}" wasn't published: ${(post.rejectionReason ?? "").slice(0, 140)}`,
      link: "/teacher/blogs",
    });
  });
}
