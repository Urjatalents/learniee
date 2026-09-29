import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { formatPostDate } from "@/features/landing/blogPosts";
import "@/features/landing/styles/landing.css";

import type { PublicBlogCard, PublicBlogPost } from "../../server/blogPublic.service";
import { blogCategoryLabel } from "../../utils/blogCategories";
import { parseMarkdown } from "../../utils/markdown";
import BlogContent from "../BlogContent";

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
}: {
  post: PublicBlogPost;
  related: PublicBlogCard[];
  basePath: string;
}) {
  const parsed = parseMarkdown(post.content);

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <Link
        href={basePath}
        className="inline-flex items-center gap-1 text-sm font-semibold text-violet-700 hover:underline mb-4"
      >
        <ArrowLeft size={14} /> All blogs
      </Link>

      <article className="bg-white border border-violet-100 rounded-3xl p-5 sm:p-8">
        <Link
          href={`${basePath}?category=${post.category}`}
          className="text-xs font-bold uppercase tracking-wide text-violet-600 hover:underline"
        >
          {blogCategoryLabel(post.category)}
        </Link>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-gray-800 mt-2 break-words">{post.title}</h1>
        <p className="text-gray-600 mt-3">{post.excerpt}</p>
        <p className="text-xs text-gray-400 mt-3 mb-6">
          By {post.author.name} &middot; {formatPostDate(iso(post.publishedAt))} &middot; {post.readingMinutes} min read
        </p>

        {/* Landing styles are scoped under .lh; the wrapper holds only the article body. */}
        <div className="lh lh-embed">
          <BlogContent parsed={parsed} />
        </div>

        {post.tags.length > 0 && (
          <ul className="mt-6 flex flex-wrap gap-2" aria-label="Topics">
            {post.tags.map((t) => (
              <li key={t} className="rounded-full bg-violet-100 px-3 py-0.5 text-xs font-bold text-violet-700">
                {t}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8 rounded-2xl bg-violet-50 p-4 text-sm">
          <p className="font-semibold text-gray-800">{post.author.name}</p>
          <p className="text-gray-500">Teacher at Learniee</p>
          {post.author.bio && <p className="text-gray-600 mt-2">{post.author.bio}</p>}
        </div>
      </article>

      {related.length > 0 && (
        <section className="mt-8" aria-label="Keep reading">
          <h2 className="font-heading text-lg font-bold text-gray-800 mb-3">Keep reading</h2>
          <ul className="space-y-3">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`${basePath}/${r.slug}`}
                  className="block bg-white border border-violet-100 rounded-2xl p-4 hover:border-violet-300 transition"
                >
                  <p className="font-semibold text-gray-800 break-words">{r.title}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {blogCategoryLabel(r.category)} &middot; {r.readingMinutes} min read
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
