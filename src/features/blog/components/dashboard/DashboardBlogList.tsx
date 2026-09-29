import Link from "next/link";
import type { ReactNode } from "react";

import { listCategoryCounts, listPublishedPosts } from "../../server/blogPublic.service";
import { BLOG_CATEGORIES, getBlogCategory } from "../../utils/blogCategories";
import BlogCard from "./BlogCard";

function href(basePath: string, page: number, category?: string) {
  const qs = new URLSearchParams();
  if (category) qs.set("category", category);
  if (page > 1) qs.set("page", String(page));
  const s = qs.toString();

  return s ? `${basePath}?${s}` : basePath;
}

const CHIP = "shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition";
const CHIP_ON = "bg-brand text-white shadow-sm";
const CHIP_OFF = "bg-white border border-violet-200 text-violet-700 hover:bg-violet-50";

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
  const featureFirst = page === 1 && !cat && posts.length >= 2;

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      {/* Hero */}
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-light to-brand-dark p-6 sm:p-10 text-white">
        <span aria-hidden="true" className="absolute -right-10 -top-10 size-44 rounded-full bg-white/10" />
        <span aria-hidden="true" className="absolute right-24 bottom-[-2.5rem] size-24 rounded-full bg-brand-yellow/80" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-yellow">Learniee blog</p>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold mt-2">{cat ? cat.label : "Brain bites"}</h1>
            <p className="mt-2 text-sm sm:text-base text-white/85">
              {cat
                ? cat.description
                : "Guides on study habits, exam preparation and choosing the right classes. Written by Learniee teachers."}
            </p>
          </div>
          {action}
        </div>
      </header>

      {/* Categories */}
      {activeCategories.length > 0 && (
        <nav aria-label="Blog categories" className="mt-6 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <Link href={basePath} className={`${CHIP} ${!cat ? CHIP_ON : CHIP_OFF}`}>
            All
          </Link>
          {activeCategories.map((c) => (
            <Link
              key={c.slug}
              href={href(basePath, 1, c.slug)}
              className={`${CHIP} ${cat?.slug === c.slug ? CHIP_ON : CHIP_OFF}`}
            >
              {c.label}
            </Link>
          ))}
        </nav>
      )}

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="mt-6 rounded-3xl border-2 border-dashed border-violet-200 bg-white p-10 text-center">
          <p className="font-heading text-lg font-bold text-gray-800">No posts here yet</p>
          <p className="mt-1 text-sm text-gray-500">Check back soon — new guides are added regularly.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, i) => (
            <BlogCard
              key={post.slug}
              post={post}
              href={`${basePath}/${post.slug}`}
              featured={featureFirst && i === 0}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="mt-8 flex items-center justify-between gap-3 text-sm font-semibold" aria-label="Blog pages">
          {page > 1 ? (
            <Link href={href(basePath, page - 1, cat?.slug)} className={`${CHIP} ${CHIP_OFF}`}>
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="font-normal text-gray-500">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={href(basePath, page + 1, cat?.slug)} className={`${CHIP} ${CHIP_OFF}`}>
              Older →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
