import type { Metadata } from "next";

import LegalPage from "@/features/landing/components/LegalPage";
import { TERMS } from "@/features/landing/legal/terms";
import { getSiteUrl } from "@/lib/siteUrl";

const TITLE = "Terms & Conditions | Learniee";
const DESCRIPTION =
  "The terms that govern use of the Learniee online tuition platform: accounts, enrollment, monthly billing, classes, cancellations, wallet, referrals and conduct.";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/terms" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    siteName: "Learniee",
    url: "/terms",
  },
};

export default function Page() {
  return <LegalPage doc={TERMS} />;
}
