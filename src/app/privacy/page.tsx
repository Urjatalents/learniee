import type { Metadata } from "next";

import LegalPage from "@/features/landing/components/LegalPage";
import { PRIVACY } from "@/features/landing/legal/privacy";
import { getSiteUrl } from "@/lib/siteUrl";

const TITLE = "Privacy Policy | Learniee";
const DESCRIPTION =
  "How Learniee collects, uses, shares and protects personal information of parents, children and teachers, and the choices you have.";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    siteName: "Learniee",
    url: "/privacy",
  },
};

export default function Page() {
  return <LegalPage doc={PRIVACY} />;
}
