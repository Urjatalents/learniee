import "server-only";

import { BlogPostStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { displayName } from "@/features/shared/utils/displayName";

/**
 * Public Blog reads (Sep 29, 2026) — what /blog, /blog/[slug], the
 * sitemap and the RSS feed show. ONLY `PUBLISHED` rows are ever
 * returned, and only the fields listed here (never a Teacher's email
 * or contact details).
 *
 * Listing/feed/sitemap helpers swallow DB errors and return empty
 * results, so a DB hiccup during a static build or ISR refresh never
 * breaks the whole site. `getPublishedPost` lets errors propagate so a
 * transient failure is never cached as a 404.
 */

export const BLOG_PAGE_SIZE = 12;

const PUBLISHED = { status: BlogPostStatus.PUBLISHED } as const;

const cardSelect = {
  slug: true,
  title: true,
  excerpt: true,
  category: true,
  readingMinutes: true,
  publishedAt: true,
} satisfies Prisma.BlogPostSelect;

export interface PublicBlogCard {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readingMinutes: number;
  publishedAt: Date;
}

export interface PublicBlogPost extends PublicBlogCard {
  content: string;
  tags: string[];
  updatedAt: Date;
  author: { id: string; name: string; bio: string | null };
}

function toCard(row: {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readingMinutes: number;
  publishedAt: Date | null;
}): PublicBlogCard {
  return { ...row, publishedAt: row.publishedAt ?? new Date(0) };
}

export async function listPublishedPosts(opts: { page: number; category?: string }) {
  const page = Math.max(1, Math.floor(opts.page) || 1);
  const where: Prisma.BlogPostWhereInput = {
    ...PUBLISHED,
    ...(opts.category ? { category: opts.category } : {}),
  };

  try {
    const [rows, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        skip: (page - 1) * BLOG_PAGE_SIZE,
        take: BLOG_PAGE_SIZE,
        select: cardSelect,
      }),
      prisma.blogPost.count({ where }),
    ]);

    return {
      posts: rows.map(toCard),
      total,
      totalPages: Math.max(1, Math.ceil(total / BLOG_PAGE_SIZE)),
    };
  } catch (err) {
    console.error("Blog list failed:", err);
    return { posts: [] as PublicBlogCard[], total: 0, totalPages: 1 };
  }
}

export async function listLatestPublished(limit: number): Promise<PublicBlogCard[]> {
  try {
    const rows = await prisma.blogPost.findMany({
      where: PUBLISHED,
      orderBy: { publishedAt: "desc" },
      take: limit,
      select: cardSelect,
    });

    return rows.map(toCard);
  } catch (err) {
    console.error("Blog latest failed:", err);
    return [];
  }
}

/** Categories that currently have at least one published post, with counts. */
export async function listCategoryCounts(): Promise<Record<string, number>> {
  try {
    const groups = await prisma.blogPost.groupBy({
      by: ["category"],
      where: PUBLISHED,
      _count: { _all: true },
    });

    return Object.fromEntries(groups.map((g) => [g.category, g._count._all]));
  } catch (err) {
    console.error("Blog category counts failed:", err);
    return {};
  }
}

export async function getPublishedPost(slug: string): Promise<PublicBlogPost | null> {
  const row = await prisma.blogPost.findFirst({
    where: { slug, ...PUBLISHED },
    select: {
      ...cardSelect,
      content: true,
      tags: true,
      updatedAt: true,
      teacher: {
        select: { id: true, firstName: true, lastName: true, visibleName: true, aboutMe: true },
      },
    },
  });

  if (!row) return null;

  const bio = row.teacher.aboutMe?.trim();

  return {
    ...toCard(row),
    content: row.content,
    tags: row.tags,
    updatedAt: row.updatedAt,
    author: {
      id: row.teacher.id,
      name: displayName(row.teacher),
      bio: bio ? (bio.length > 240 ? `${bio.slice(0, 237)}...` : bio) : null,
    },
  };
}

/** Same-category posts first, topped up with the latest others. */
export async function listRelatedPosts(
  post: { slug: string; category: string },
  limit = 3,
): Promise<PublicBlogCard[]> {
  try {
    const same = await prisma.blogPost.findMany({
      where: { ...PUBLISHED, category: post.category, slug: { not: post.slug } },
      orderBy: { publishedAt: "desc" },
      take: limit,
      select: cardSelect,
    });

    if (same.length >= limit) return same.map(toCard);

    const others = await prisma.blogPost.findMany({
      where: {
        ...PUBLISHED,
        category: { not: post.category },
        slug: { not: post.slug },
      },
      orderBy: { publishedAt: "desc" },
      take: limit - same.length,
      select: cardSelect,
    });

    return [...same, ...others].map(toCard);
  } catch (err) {
    console.error("Blog related failed:", err);
    return [];
  }
}

export async function listPublishedForSitemap() {
  try {
    return await prisma.blogPost.findMany({
      where: PUBLISHED,
      orderBy: { publishedAt: "desc" },
      select: { slug: true, category: true, updatedAt: true },
      take: 5000,
    });
  } catch (err) {
    console.error("Blog sitemap failed:", err);
    return [];
  }
}

export async function listPublishedForFeed(limit = 30) {
  try {
    const rows = await prisma.blogPost.findMany({
      where: PUBLISHED,
      orderBy: { publishedAt: "desc" },
      take: limit,
      select: {
        ...cardSelect,
        teacher: { select: { firstName: true, lastName: true, visibleName: true } },
      },
    });

    return rows.map((r) => ({ ...toCard(r), authorName: displayName(r.teacher) }));
  } catch (err) {
    console.error("Blog feed failed:", err);
    return [];
  }
}
