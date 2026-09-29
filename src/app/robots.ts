import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/siteUrl";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Logged-in areas and APIs have no SEO value and must not be crawled.
        disallow: [
          "/api/",
          "/admin",
          "/teacher",
          "/parent",
          "/accounts",
          "/hr",
          "/it",
          "/forgot-password",
          "/confirm",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
