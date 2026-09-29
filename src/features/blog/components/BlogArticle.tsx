import Link from "next/link";

import CloseCta from "@/features/landing/components/CloseCta";
import LandingFooter from "@/features/landing/components/LandingFooter";
import LandingHeader from "@/features/landing/components/LandingHeader";
import PostCard from "@/features/landing/components/PostCard";
import { formatPostDate } from "@/features/landing/blogPosts";
import "@/features/landing/styles/landing.css";

import type { PublicBlogCard, PublicBlogPost } from "../server/blogPublic.service";
import { blogCategoryLabel } from "../utils/blogCategories";
import { cardToPost } from "../utils/cardToPost";
import { parseMarkdown } from "../utils/markdown";
import BlogContent from "./BlogContent";

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function BlogArticle({
  post,
  related,
  jsonLd,
}: {
  post: PublicBlogPost;
  related: PublicBlogCard[];
  jsonLd: unknown[];
}) {
  const parsed = parseMarkdown(post.content);
  const categoryLabel = blogCategoryLabel(post.category);
  const updatedLater = post.updatedAt.getTime() - post.publishedAt.getTime() > 24 * 3600 * 1000;

  return (
    <div className="lh">
      {jsonLd.map((data, i) => (
        <script
          key={i}
          type="application/ld+json"
          // Server-built object; "<" escaped so post text can never close the tag.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
        />
      ))}

      <a className="skip" href="#main">
        Skip to content
      </a>

      <LandingHeader />

      <main id="main">
        <section className="pagehead">
          <div className="wrap awrap">
            <nav className="crumbs" aria-label="Breadcrumb">
              <Link href="/">Home</Link>
              <span aria-hidden="true">/</span>
              <Link href="/blog">Blog</Link>
              <span aria-hidden="true">/</span>
              <Link href={`/blog/category/${post.category}`}>{categoryLabel}</Link>
            </nav>
            <h1>{post.title}</h1>
            <p className="lede">{post.excerpt}</p>
            <p className="ameta">
              <span>By {post.author.name}</span>
              <span aria-hidden="true">·</span>
              <time dateTime={iso(post.publishedAt)}>{formatPostDate(iso(post.publishedAt))}</time>
              <span aria-hidden="true">·</span>
              <span>{post.readingMinutes} min read</span>
              {updatedLater && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    Updated <time dateTime={iso(post.updatedAt)}>{formatPostDate(iso(post.updatedAt))}</time>
                  </span>
                </>
              )}
            </p>
          </div>
        </section>

        <section className="article">
          <div className="wrap awrap">
            <article>
              {parsed.headings.length >= 3 && (
                <nav className="toc" aria-label="Table of contents">
                  <b>In this article</b>
                  <ol>
                    {parsed.headings.map((h) => (
                      <li key={h.id} className={h.level === 3 ? "sub" : undefined}>
                        <a href={`#${h.id}`}>{h.text}</a>
                      </li>
                    ))}
                  </ol>
                </nav>
              )}

              <BlogContent parsed={parsed} />

              {post.tags.length > 0 && (
                <ul className="atags" aria-label="Topics">
                  {post.tags.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              )}
            </article>

            <aside className="abox" aria-label="About the author">
              <b>{post.author.name}</b>
              <span>Teacher at Learniee</span>
              {post.author.bio && <p>{post.author.bio}</p>}
            </aside>

            <aside className="acta" aria-label="Try Learniee">
              <h2>See how one-to-one online classes feel</h2>
              <p>Every Learniee account gets two free demo classes with a real teacher. No card needed.</p>
              <Link className="btn" href="/signup">
                Book a free demo
              </Link>
            </aside>
          </div>
        </section>

        {related.length > 0 && (
          <section className="blogindex">
            <div className="wrap">
              <h2>Keep reading</h2>
              <div className="bgrid" style={{ marginTop: 28 }}>
                {related.map((r, i) => (
                  <PostCard key={r.slug} post={cardToPost(r)} index={i} showExcerpt />
                ))}
              </div>
            </div>
          </section>
        )}

        <CloseCta />
      </main>

      <LandingFooter />
    </div>
  );
}
