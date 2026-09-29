import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import BlogArticle from "@/features/blog/components/BlogArticle";
import {
  getPublishedPost,
  listRelatedPosts,
} from "@/features/blog/server/blogPublic.service";
import { blogCategoryLabel } from "@/features/blog/utils/blogCategories";
import { countWords } from "@/features/blog/utils/blogRules";
import { absoluteUrl, getSiteUrl } from "@/lib/siteUrl";

// ISR: rendered on first request, refreshed every 5 minutes, and immediately
// when a post is published/unpublished (see revalidateBlogPaths).
export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

// One DB read shared by generateMetadata and the page.
const loadPost = cache(getPublishedPost);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await loadPost(slug);

  if (!post) return { title: "Post not found | Learniee", robots: { index: false } };

  const url = `/blog/${post.slug}`;

  return {
    metadataBase: new URL(getSiteUrl()),
    title: { absolute: `${post.title} | Learniee` },
    description: post.excerpt,
    keywords: post.tags,
    authors: [{ name: post.author.name }],
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      url,
      siteName: "Learniee",
      publishedTime: post.publishedAt.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: [post.author.name],
      section: blogCategoryLabel(post.category),
      tags: post.tags,
    },
    twitter: { card: "summary_large_image", title: post.title, description: post.excerpt },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await loadPost(slug);

  if (!post) notFound();

  const related = await listRelatedPosts(post, 3);
  const url = absoluteUrl(`/blog/${post.slug}`);
  const categoryLabel = blogCategoryLabel(post.category);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.excerpt,
      url,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      datePublished: post.publishedAt.toISOString(),
      dateModified: post.updatedAt.toISOString(),
      author: { "@type": "Person", name: post.author.name },
      publisher: {
        "@type": "Organization",
        name: "Learniee",
        url: getSiteUrl(),
        logo: { "@type": "ImageObject", url: absoluteUrl("/icon.png") },
      },
      image: [absoluteUrl(`/blog/${post.slug}/opengraph-image`)],
      articleSection: categoryLabel,
      keywords: post.tags.join(", "),
      wordCount: countWords(post.content),
      inLanguage: "en",
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "Blog", item: absoluteUrl("/blog") },
        {
          "@type": "ListItem",
          position: 3,
          name: categoryLabel,
          item: absoluteUrl(`/blog/category/${post.category}`),
        },
        { "@type": "ListItem", position: 4, name: post.title, item: url },
      ],
    },
  ];

  return <BlogArticle post={post} related={related} jsonLd={jsonLd} />;
}
