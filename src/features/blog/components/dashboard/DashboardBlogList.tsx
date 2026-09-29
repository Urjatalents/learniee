import Link from "next/link";
import type { ReactNode } from "react";

import { formatPostDate } from "@/features/landing/blogPosts";

import { listCategoryCounts, listPublishedPosts } from "../../server/blogPublic.service";
import { BLOG_CATEGORIES, blogCategoryLabel, getBlogCategory } from "../../utils/blogCategories";

function href(basePath: string, page: number, category?: string) {
  const qs = new URLSearchParams();
  if (category) qs.set("category", category);
  if (page > 1) qs.set("page", String(page));
  const s = qs.toString();

  return s ? `${basePath}?${s}` : basePath;
}

/**
 * Blog listing shown INSIDE the Parent / Teacher dashboard (keeps the sidebar,
 * navbar and login session). Links stay under `basePath`, never the public /blog.
 */
export default async function DashboardBlogList({
  basePath,
  page,
  category,
  action,
}: {
  basePath: string;
  page: number;
  category?: string;
  action?: ReactNode;
}) {
  const cat = category ? getBlogCategory(category) : undefined;
  const [{ posts, totalPages }, counts] = await Promise.all([
    listPublishedPosts({ page, category: cat?.slug }),
    listCategoryCounts(),
  ]);
  const activeCategories = BLOG_CATEGORIES.filter((c) => (counts[c.slug] ?? 0) > 0);

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-brand">Blogs</p>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-gray-800 mt-1">
            {cat ? cat.label : "Brain bites"}
          </h1>
          <p className="text-gray-500 mt-1 text-sm max-w-xl">
            {cat
              ? cat.description
              : "Guides on study habits, exam preparation and choosing the right classes. Written by Learniee teachers."}
          </p>
        </div>
        {action}
      </div>

      {activeCategories.length > 0 && (
        <nav aria-label="Blog categories" className="mb-6 flex flex-wrap gap-2">
          <Link
            href={basePath}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              !cat ? "bg-violet-600 text-white" : "bg-white border border-violet-200 text-violet-700 hover:bg-violet-50"
            }`}
          >
            All
          </Link>
          {activeCategories.map((c) => (
            <Link
              key={c.slug}
              href={href(basePath, 1, c.slug)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                cat?.slug === c.slug
                  ? "bg-violet-600 text-white"
                  : "bg-white border border-violet-200 text-violet-700 hover:bg-violet-50"
              }`}
            >
              {c.label}
            </Link>
          ))}
        </nav>
      )}

      {posts.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-violet-200 rounded-3xl p-8 text-center">
          <p className="text-gray-500">No posts here yet. Check back soon.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link
                href={`${basePath}/${post.slug}`}
                className="block bg-white border border-violet-100 rounded-2xl p-5 hover:border-violet-300 hover:shadow-sm transition"
              >
                <span className="text-xs font-bold uppercase tracking-wide text-violet-600">
                  {blogCategoryLabel(post.category)}
                </span>
                <p className="font-heading font-bold text-gray-800 mt-1 break-words">{post.title}</p>
                <p className="text-sm text-gray-600 mt-1">{post.excerpt}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {formatPostDate(post.publishedAt.toISOString().slice(0, 10))} &middot; {post.readingMinutes} min read
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-between text-sm font-semibold" aria-label="Blog pages">
          {page > 1 ? (
            <Link href={href(basePath, page - 1, cat?.slug)} className="text-violet-700 hover:underline">
              ← Newer posts
            </Link>
          ) : (
            <span />
          )}
          <span className="text-gray-500 font-normal">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={href(basePath, page + 1, cat?.slug)} className="text-violet-700 hover:underline">
              Older posts →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
