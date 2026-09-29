import Link from "next/link";
import { PenLine } from "lucide-react";

import DashboardBlogList from "@/features/blog/components/dashboard/DashboardBlogList";

export default async function TeacherBlogReaderPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string }>;
}) {
  const { page, category } = await searchParams;

  return (
    <DashboardBlogList
      basePath="/teacher/blogs/read"
      page={Number.parseInt(page ?? "1", 10) || 1}
      category={category}
      action={
        <Link
          href="/teacher/blogs"
          className="inline-flex items-center gap-2 rounded-full bg-brand-yellow px-4 py-2.5 text-sm font-bold text-violet-900 shadow-sm hover:brightness-95"
        >
          <PenLine size={16} /> Your posts
        </Link>
      }
    />
  );
}
