import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";

import { formatPostDate } from "@/features/landing/blogPosts";

import type { PublicBlogCard } from "../../server/blogPublic.service";
import { blogCategoryLabel } from "../../utils/blogCategories";
import BlogCover from "./BlogCover";

/** One post card for the in-dashboard blog list. `featured` = wide hero card. */
export default function BlogCard({
  post,
  href,
  featured = false,
}: {
  post: PublicBlogCard;
  href: string;
  featured?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-lg ${
        featured ? "flex-col md:col-span-2 lg:col-span-3 md:flex-row" : "flex-col"
      }`}
    >
      <BlogCover
        category={post.category}
        className={featured ? "h-44 md:h-auto md:w-2/5 md:min-h-56" : "h-32"}
      />

      <div className={`flex flex-1 flex-col p-5 ${featured ? "sm:p-7 justify-center" : ""}`}>
        <span className="w-fit rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-violet-700">
          {blogCategoryLabel(post.category)}
        </span>

        <h2
          className={`font-heading font-bold text-gray-800 mt-3 break-words group-hover:text-brand transition-colors ${
            featured ? "text-xl sm:text-2xl line-clamp-3" : "text-lg line-clamp-2"
          }`}
        >
          {post.title}
        </h2>

        <p className={`mt-2 text-sm text-gray-600 ${featured ? "line-clamp-4" : "line-clamp-3"}`}>{post.excerpt}</p>

        <div className="mt-auto pt-4 flex items-center justify-between text-xs text-gray-400">
          <span className="inline-flex items-center gap-1.5">
            <Clock size={12} />
            {formatPostDate(post.publishedAt.toISOString().slice(0, 10))} &middot; {post.readingMinutes} min read
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-violet-600">
            Read <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
