import type { Metadata } from "next";
import { notFound } from "next/navigation";

import BlogIndex from "@/features/blog/components/BlogIndex";
import { getBlogCategory } from "@/features/blog/utils/blogCategories";
import { getSiteUrl } from "@/lib/siteUrl";

export const revalidate = 300;

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cat = getBlogCategory((await params).category);
  if (!cat) return { robots: { index: false } };

  const title = `${cat.label} — Learniee Blog`;
  const url = `/blog/category/${cat.slug}`;

  return {
    metadataBase: new URL(getSiteUrl()),
    title: { absolute: title },
    description: cat.description,
    alternates: { canonical: url },
    openGraph: { title, description: cat.description, type: "website", siteName: "Learniee", url },
  };
}

export default async function BlogCategoryPage({ params }: Props) {
  const cat = getBlogCategory((await params).category);
  if (!cat) notFound();

  return <BlogIndex category={cat.slug} />;
}
