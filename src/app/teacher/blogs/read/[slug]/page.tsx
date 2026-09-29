import { notFound } from "next/navigation";

import DashboardBlogArticle from "@/features/blog/components/dashboard/DashboardBlogArticle";
import { getPublishedPost, listRelatedPosts } from "@/features/blog/server/blogPublic.service";

export default async function TeacherBlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);

  if (!post) notFound();

  const related = await listRelatedPosts(post, 3);

  return <DashboardBlogArticle post={post} related={related} basePath="/teacher/blogs/read" teacherProfileBasePath="/teacher/teachers" />;
}
