import BlogEditor from "@/features/blog/components/BlogEditor";

export default async function EditTeacherBlogPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;

  return <BlogEditor postId={postId} />;
}
