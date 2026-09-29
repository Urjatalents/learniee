import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import BlogIndex from "@/features/blog/components/BlogIndex";
import { listPublishedPosts } from "@/features/blog/server/blogPublic.service";
import { getSiteUrl } from "@/lib/siteUrl";

export const revalidate = 300;

type Props = { params: Promise<{ page: string }> };

function parsePage(raw: string): number | null {
  return /^\d{1,4}$/.test(raw) ? Number(raw) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const n = parsePage((await params).page);
  if (n === null || n < 2) return { robots: { index: false } };

  const title = `Blog — Page ${n} | Learniee`;
  const description = `Older Learniee blog posts on study habits, exam preparation and online learning — page ${n}.`;

  return {
    metadataBase: new URL(getSiteUrl()),
    title: { absolute: title },
    description,
    alternates: { canonical: `/blog/page/${n}` },
    openGraph: { title, description, type: "website", siteName: "Learniee", url: `/blog/page/${n}` },
  };
}

export default async function BlogPageN({ params }: Props) {
  const n = parsePage((await params).page);

  if (n === null || n < 1) notFound();
  if (n === 1) permanentRedirect("/blog");

  const { totalPages } = await listPublishedPosts({ page: n });
  if (n > totalPages) notFound();

  return <BlogIndex page={n} />;
}
