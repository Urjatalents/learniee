import type { Metadata } from "next";

import ReferralPage from "@/features/landing/components/ReferralPage";
import { getSiteUrl } from "@/lib/siteUrl";

const TITLE = "Refer & Earn — Get ₹500 for every friend who enrolls | Learniee";
const DESCRIPTION =
  "Share your Learniee referral code with friends. When they enroll in a course, ₹500 is credited to your Learniee Wallet. Sign up to get your code.";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/referral" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    siteName: "Learniee",
    url: "/referral",
  },
};

export default function Page() {
  return <ReferralPage />;
}
