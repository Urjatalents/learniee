/**
 * Canonical public origin (no trailing slash) for absolute URLs in the
 * sitemap, RSS feed and JSON-LD. Set NEXT_PUBLIC_SITE_URL in every
 * environment (e.g. https://www.learniee.com) — the fallback exists only
 * so a missing variable can't break the build.
 */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://learniee.com";

  return raw.replace(/\/+$/, "");
}

export function absoluteUrl(path: string): string {
  return `${getSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
