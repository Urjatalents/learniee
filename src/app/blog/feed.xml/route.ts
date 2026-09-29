import { listPublishedForFeed } from "@/features/blog/server/blogPublic.service";
import { blogCategoryLabel } from "@/features/blog/utils/blogCategories";
import { absoluteUrl } from "@/lib/siteUrl";

// Refreshed on publish/unpublish (revalidateBlogPaths) and at least hourly.
export const revalidate = 3600;

function xml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** RSS 2.0 feed of the latest published posts. */
export async function GET() {
  const posts = await listPublishedForFeed(30);

  const items = posts
    .map((p) => {
      const link = absoluteUrl(`/blog/${p.slug}`);

      return `<item>
<title>${xml(p.title)}</title>
<link>${xml(link)}</link>
<guid isPermaLink="true">${xml(link)}</guid>
<pubDate>${p.publishedAt.toUTCString()}</pubDate>
<dc:creator>${xml(p.authorName)}</dc:creator>
<category>${xml(blogCategoryLabel(p.category))}</category>
<description>${xml(p.excerpt)}</description>
</item>`;
    })
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
<title>Learniee Blog</title>
<link>${xml(absoluteUrl("/blog"))}</link>
<description>Guides for parents on study habits, exam preparation and online learning.</description>
<language>en</language>
<atom:link href="${xml(absoluteUrl("/blog/feed.xml"))}" rel="self" type="application/rss+xml" />
<lastBuildDate>${(posts[0]?.publishedAt ?? new Date()).toUTCString()}</lastBuildDate>
${items}
</channel>
</rss>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

