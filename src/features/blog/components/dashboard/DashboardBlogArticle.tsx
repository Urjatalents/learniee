import Link from "next/link";
import { ArrowLeft, Clock, UserRound } from "lucide-react";

import { formatPostDate } from "@/features/landing/blogPosts";
import "@/features/landing/styles/landing.css";

import type { PublicBlogCard, PublicBlogPost } from "../../server/blogPublic.service";
import { blogCategoryLabel } from "../../utils/blogCategories";
import { parseMarkdown } from "../../utils/markdown";
import BlogContent from "../BlogContent";
import BlogCard from "./BlogCard";
import { blogTheme } from "./blogTheme";

const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * One article INSIDE the Parent / Teacher dashboard. Same content renderer as
 * the public page, without the marketing header/footer, so the user stays
 * signed in and keeps the dashboard sidebar.
 */
export default function DashboardBlogArticle({
  post,
  related,
  basePath,
  teacherProfileBasePath,
}: {
  post: PublicBlogPost;
  related: PublicBlogCard[];
  basePath: string;
  /** e.g. "/parent/teachers" — the author's profile lives at `${teacherProfileBasePath}/${author.id}`. */
  teacherProfileBasePath: string;
}) {
  const parsed = parseMarkdown(post.content);
  const { gradient } = blogTheme(post.category);
  const initial = post.author.name.trim().charAt(0).toUpperCase() || "L";

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <Link
        href={basePath}
        className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-white px-3.5 py-1.5 text-sm font-semibold text-violet-700 hover:bg-violet-50"
      >
        <ArrowLeft size={14} /> All blogs
      </Link>

      {/* Hero */}
      <header className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} p-6 sm:p-10 text-white`}>
        <span aria-hidden="true" className="absolute -right-10 -top-10 size-44 rounded-full bg-white/15" />
        <span aria-hidden="true" className="absolute right-20 bottom-[-2rem] size-20 rounded-full bg-brand-yellow/80" />
        <div className="relative max-w-2xl">
          <Link
            href={`${basePath}?category=${post.category}`}
            className="inline-block rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-widest hover:bg-white/30"
          >
            {blogCategoryLabel(post.category)}
          </Link>
          <h1 className="font-heading text-2xl sm:text-4xl font-bold mt-3 break-words">{post.title}</h1>
          <p className="mt-3 text-sm sm:text-base text-white/90">{post.excerpt}</p>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-white/90">
            <span className="flex size-9 items-center justify-center rounded-full bg-brand-yellow font-bold text-violet-900">
              {initial}
            </span>
            <span className="font-semibold">{post.author.name}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={iso(post.publishedAt)}>{formatPostDate(iso(post.publishedAt))}</time>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <Clock size={13} /> {post.readingMinutes} min read
            </span>
          </div>
        </div>
      </header>

      {/* Body */}
      <article className="mt-6 rounded-3xl border border-violet-100 bg-white p-5 sm:p-10 shadow-sm">
        {/* Landing styles are scoped under .lh; the wrapper holds only the article body. */}
        <div className="lh lh-embed mx-auto max-w-2xl">
          <BlogContent parsed={parsed} />
        </div>

        {post.tags.length > 0 && (
          <ul className="mx-auto mt-8 flex max-w-2xl flex-wrap gap-2" aria-label="Topics">
            {post.tags.map((t) => (
              <li key={t} className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
                #{t}
              </li>
            ))}
          </ul>
        )}

        <aside
          aria-label="About the author"
          className="mx-auto mt-8 flex max-w-2xl items-start gap-4 rounded-2xl bg-violet-50 p-5"
        >
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-yellow text-lg font-bold text-violet-900">
            {initial}
          </span>
          <div className="min-w-0">
            <p className="font-heading font-bold text-gray-800">{post.author.name}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">Teacher at Learniee</p>
            {post.author.bio && <p className="mt-2 text-sm text-gray-600">{post.author.bio}</p>}
            <Link
              href={`${teacherProfileBasePath}/${post.author.id}`}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              <UserRound size={15} /> Visit teacher profile
            </Link>
          </div>
        </aside>
      </article>

      {related.length > 0 && (
        <section className="mt-10" aria-label="Keep reading">
          <h2 className="font-heading text-xl font-bold text-gray-800 mb-4">Keep reading</h2>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <BlogCard key={r.slug} post={r} href={`${basePath}/${r.slug}`} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
