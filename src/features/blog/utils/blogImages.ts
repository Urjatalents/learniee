/**
 * Blog image rules shared by the editor (client), the Markdown parser and
 * the image-serving route. Images are uploaded to the private S3 bucket
 * under `blog-images/{teacherId}/{uuid}.{ext}` and shown through the public
 * route `/api/blog-images/{teacherId}/{uuid}.{ext}` (the bucket itself stays
 * private). Only that URL shape is ever rendered as an <img>.
 */

export const BLOG_IMAGE_S3_PREFIX = "blog-images/";
export const BLOG_IMAGE_ROUTE_PREFIX = "/api/blog-images/";

export const BLOG_IMAGE_MIME_TYPES = ["image/png", "image/jpeg"] as const;
export const BLOG_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const BLOG_IMAGE_ALT_MAX_CHARS = 140;

/** Route params: teacher id segment and the uuid file name. */
export const BLOG_IMAGE_OWNER_RE = /^[A-Za-z0-9_-]{1,64}$/;
export const BLOG_IMAGE_FILE_RE = /^[0-9a-f-]{36}\.(?:png|jpe?g)$/;

/** True only for URLs produced by blogImageUrlFromKey(). */
export function isBlogImageUrl(src: string): boolean {
  if (!src.startsWith(BLOG_IMAGE_ROUTE_PREFIX)) return false;

  const [owner, file, ...rest] = src.slice(BLOG_IMAGE_ROUTE_PREFIX.length).split("/");

  return (
    rest.length === 0 &&
    Boolean(owner) &&
    Boolean(file) &&
    BLOG_IMAGE_OWNER_RE.test(owner) &&
    BLOG_IMAGE_FILE_RE.test(file)
  );
}

/** `blog-images/abc/uuid.jpg` (the S3 key) -> `/api/blog-images/abc/uuid.jpg`. */
export function blogImageUrlFromKey(key: string): string {
  return `${BLOG_IMAGE_ROUTE_PREFIX}${key.slice(BLOG_IMAGE_S3_PREFIX.length)}`;
}

/** Alt text goes inside Markdown brackets, so strip anything that would break the syntax. */
export function cleanAltText(raw: string): string {
  return raw
    .replace(/[\[\]()\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, BLOG_IMAGE_ALT_MAX_CHARS);
}
