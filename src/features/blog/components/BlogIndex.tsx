import Link from "next/link";

import CloseCta from "@/features/landing/components/CloseCta";
import LandingFooter from "@/features/landing/components/LandingFooter";
import LandingHeader from "@/features/landing/components/LandingHeader";
import PostCard from "@/features/landing/components/PostCard";
import { BLOG_POSTS } from "@/features/landing/blogPosts";
import "@/features/landing/styles/landing.css";

import {
  listCategoryCounts,
  listPublishedPosts,
} from "../server/blogPublic.service";
import { BLOG_CATEGORIES, getBlogCategory } from "../utils/blogCategories";
import { cardToPost } from "../utils/cardToPost";

function pageHref(n: number) {
  return n <= 1 ? "/blog" : `/blog/page/${n}`;
}

/**
 * Public blog listing. Used by /blog, /blog/page/[page] and
 * /blog/category/[category] so all three share one layout.
 * Server component — the page routes control caching (ISR).
 */
export default async function BlogIndex({
  page = 1,
  category,
}: {
  page?: number;
  category?: string;
}) {
  const cat = category ? getBlogCategory(category) : undefined;
  const [{ posts, total, totalPages }, counts] = await Promise.all([
    listPublishedPosts({ page, category: cat?.slug }),
    listCategoryCounts(),
  ]);

  // Until the first in-app posts exist, show the legacy external ones so /blog isn't empty.
  const showLegacyAsMain = !cat && total === 0;
  const showLegacyStrip = !cat && total > 0 && page === 1;
  const activeCategories = BLOG_CATEGORIES.filter((c) => (counts[c.slug] ?? 0) > 0);

  return (
    <div className="lh">
      <a className="skip" href="#main">
        Skip to content
      </a>

      <LandingHeader />

      <main id="main">
        <section className="pagehead">
          <div className="wrap">
            <h1>{cat ? cat.label : "Brain bites"}</h1>
            <p className="lede">
              {cat
                ? cat.description
                : "Guides for parents on study habits, exam preparation and choosing the right classes for your child. Written by Learniee teachers."}
            </p>
          </div>
        </section>

        <section className="blogindex">
          <div className="wrap">
            {activeCategories.length > 0 && (
              <nav aria-label="Blog categories">
                <ul className="bchips">
                  <li>
                    <Link href="/blog" aria-current={!cat ? "page" : undefined}>
                      All
                    </Link>
                  </li>
                  {activeCategories.map((c) => (
                    <li key={c.slug}>
                      <Link
                        href={`/blog/category/${c.slug}`}
                        aria-current={cat?.slug === c.slug ? "page" : undefined}
                      >
                        {c.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            )}

            {showLegacyAsMain ? (
              <div className="bgrid">
                {BLOG_POSTS.map((post, i) => (
                  <PostCard key={post.slug} post={post} index={i} showExcerpt />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <p className="lede">No posts here yet. Check back soon.</p>
            ) : (
              <div className="bgrid">
                {posts.map((post, i) => (
                  <PostCard key={post.slug} post={cardToPost(post)} index={i} showExcerpt />
                ))}
              </div>
            )}

            {totalPages > 1 && !cat && (
              <nav className="bpager" aria-label="Blog pages">
                {page > 1 ? (
                  <Link href={pageHref(page - 1)} rel="prev">
                    ← Newer posts
                  </Link>
                ) : (
                  <span />
                )}
                <span>
                  Page {page} of {totalPages}
                </span>
                {page < totalPages ? (
                  <Link href={pageHref(page + 1)} rel="next">
                    Older posts →
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            )}

            {cat && totalPages > 1 && (
              <p className="bpager">
                <Link href="/blog">See all posts →</Link>
              </p>
            )}

            {showLegacyStrip && (
              <div className="blegacy">
                <h2>More guides</h2>
                <div className="bgrid">
                  {BLOG_POSTS.slice(0, 3).map((post, i) => (
                    <PostCard key={post.slug} post={post} index={i} showExcerpt />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <CloseCta />
      </main>

      <LandingFooter />
    </div>
  );
}
