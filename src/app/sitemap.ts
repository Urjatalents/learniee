import type { MetadataRoute } from "next";

import {
  listCategoryCounts,
  listPublishedForSitemap,
} from "@/features/blog/server/blogPublic.service";
import { absoluteUrl } from "@/lib/siteUrl";

// Refreshed on publish/unpublish (revalidateBlogPaths) and at least hourly.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, counts] = await Promise.all([listPublishedForSitemap(), listCategoryCounts()]);

  return [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/blog"), changeFrequency: "daily", priority: 0.8 },
    ...Object.keys(counts).map((category) => ({
      url: absoluteUrl(`/blog/category/${category}`),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...posts.map((p) => ({
      url: absoluteUrl(`/blog/${p.slug}`),
      lastModified: p.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
