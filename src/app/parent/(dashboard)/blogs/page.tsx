import DashboardBlogList from "@/features/blog/components/dashboard/DashboardBlogList";

export default async function ParentBlogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string }>;
}) {
  const { page, category } = await searchParams;

  return (
    <DashboardBlogList
      basePath="/parent/blogs"
      page={Number.parseInt(page ?? "1", 10) || 1}
      category={category}
    />
  );
}
