import type { Metadata } from "next";
import BlogPage from "@/features/landing/components/BlogPage";

const DESCRIPTION =
  "Guides for parents on study habits, exam preparation and choosing the right online classes for your child.";

export const metadata: Metadata = {
  title: "Blog — Learniee",
  description: DESCRIPTION,
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Blog — Learniee",
    description: DESCRIPTION,
    type: "website",
    siteName: "Learniee",
    url: "/blog",
  },
};

export default function Page() {
  return <BlogPage />;
}
