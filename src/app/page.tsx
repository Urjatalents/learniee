import type { Metadata, Viewport } from "next";
import LandingPage from "@/features/landing/components/LandingPage";

export const metadata: Metadata = {
  title: "Learniee — Expert online tuition for ages 3 to 18",
  description:
    "Live online tuition for ages 3–18. One-to-one and group classes, school subjects, hobbies and competitive exams. Book a free demo.",
  openGraph: {
    title: "Learniee — Online tuition with top teachers, at fair prices",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#7B5BE0",
  viewportFit: "cover",
};

export default function HomePage() {
  return <LandingPage />;
}
