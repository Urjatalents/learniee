import type { BlogPost } from "@/features/landing/blogPosts";
import type { PublicBlogCard } from "../server/blogPublic.service";
import { blogCategoryLabel } from "./blogCategories";

/** Adapts a DB-backed card to the shape the landing PostCard already renders. */
export function cardToPost(card: PublicBlogCard): BlogPost {
  return {
    slug: card.slug,
    title: card.title,
    tag: blogCategoryLabel(card.category),
    date: card.publishedAt.toISOString().slice(0, 10),
    excerpt: card.excerpt,
    url: `/blog/${card.slug}`,
  };
}
