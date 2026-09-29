import type { Metadata } from "next";

import BlogIndex from "@/features/blog/components/BlogIndex";
import { getSiteUrl } from "@/lib/siteUrl";

// Published/unpublished posts revalidate this page immediately; this is the safety net.
export const revalidate = 300;

const TITLE = "Blog — Study Tips & Parenting Guides | Learniee";
const DESCRIPTION =
  "Guides for parents on study habits, exam preparation and choosing the right online classes for your child, written by Learniee teachers.";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: {
    canonical: "/blog",
    types: { "application/rss+xml": "/blog/feed.xml" },
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    siteName: "Learniee",
    url: "/blog",
  },
};

export default function Page() {
  return <BlogIndex page={1} />;
}
