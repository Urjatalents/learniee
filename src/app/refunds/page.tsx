import type { Metadata } from "next";

import LegalPage from "@/features/landing/components/LegalPage";
import { REFUNDS } from "@/features/landing/legal/refunds";
import { getSiteUrl } from "@/lib/siteUrl";

const TITLE = "Refund & Cancellation Policy | Learniee";
const DESCRIPTION =
  "When Learniee refunds demo, enrollment and renewal payments, how to request a refund, and how long it takes.";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/refunds" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    siteName: "Learniee",
    url: "/refunds",
  },
};

export default function Page() {
  return <LegalPage doc={REFUNDS} />;
}
