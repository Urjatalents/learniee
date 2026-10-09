import type { Metadata } from "next";

import { catalogHref, type CatalogPage } from "./pages";

export function catalogMetadata(page: CatalogPage): Metadata {
  const title = `${page.heading} | Learniee`;
  return {
    title,
    description: page.intro,
    alternates: { canonical: catalogHref(page) },
    openGraph: { title, description: page.intro, type: "website", siteName: "Learniee", url: catalogHref(page) },
  };
}
