import type { Metadata, Viewport } from "next";
import LandingPage from "@/features/landing/components/LandingPage";

// Optional. Set NEXT_PUBLIC_SITE_URL (e.g. https://www.learniee.com) in the
// environment to get absolute canonical / Open Graph URLs; unset = relative.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

// The home page shows the latest blog posts; refresh at most every 5 minutes
// (publishing also revalidates it immediately).
export const revalidate = 300;

const TITLE = "Learniee — Expert online tuition for ages 3 to 18";
const DESCRIPTION =
  "Live online tuition for ages 3–18. One-to-one and group classes, school subjects, hobbies and competitive exams. Book a free demo.";

export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: "Learniee — Online tuition with top teachers, at fair prices",
    description: DESCRIPTION,
    type: "website",
    siteName: "Learniee",
    url: "/",
  },
};

export const viewport: Viewport = {
  themeColor: "#7B5BE0",
  viewportFit: "cover",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "Learniee",
  description: "Live online tuition for ages 3 to 18.",
  ...(siteUrl ? { url: siteUrl } : {}),
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        // Static, server-built object — safe to inline. "<" escaped defensively.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <LandingPage />
    </>
  );
}
