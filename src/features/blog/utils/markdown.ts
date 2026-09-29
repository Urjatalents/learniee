/**
 * Tiny, dependency-free Markdown-lite parser for blog posts.
 *
 * Produces a plain data tree (never HTML strings), which BlogContent.tsx
 * turns into React elements — so user-written content can never inject
 * markup or scripts. Supported:
 *
 *   ## Heading 2      ### Heading 3     (a single "# " is treated as H2:
 *                                        the post title is the page's H1)
 *   paragraphs        - or * bullet lists      1. numbered lists
 *   > quote           ---  horizontal rule
 *   **bold**   *italic*   `code`   [text](https://link)  [text](/internal)
 *   ![description](/api/blog-images/…)   on its own line (uploaded images only)
 *
 * Links to Learniee's own domain are treated as internal links.
 * Deliberately NOT supported: raw HTML, remote images, tables.
 */

import { getSiteUrl } from "@/lib/siteUrl";

import { isBlogImageUrl } from "./blogImages";

export type Inline =
  | { t: "text"; v: string }
  | { t: "strong"; c: Inline[] }
  | { t: "em"; c: Inline[] }
  | { t: "code"; v: string }
  | { t: "link"; href: string; external: boolean; c: Inline[] };

export type Block =
  | { t: "h2" | "h3"; id: string; c: Inline[]; text: string }
  | { t: "p"; c: Inline[] }
  | { t: "ul" | "ol"; items: Inline[][] }
  | { t: "quote"; c: Inline[] }
  | { t: "img"; src: string; alt: string }
  | { t: "hr" };

export interface Heading {
  id: string;
  level: 2 | 3;
  text: string;
}

export interface ParsedMarkdown {
  blocks: Block[];
  headings: Heading[];
}

const stripWww = (host: string) => host.toLowerCase().replace(/^www\./, "");

/** True when an absolute URL points at Learniee itself (www or not). */
function isOwnSite(parsed: URL): boolean {
  try {
    return stripWww(parsed.host) === stripWww(new URL(getSiteUrl()).host);
  } catch {
    return false;
  }
}

/** Returns a safe href + whether it leaves the site, or null if the URL is not allowed. */
function safeLink(raw: string): { href: string; external: boolean } | null {
  const url = raw.trim();

  if (url.startsWith("/") && !url.startsWith("//")) {
    return { href: url, external: false };
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      // https://learniee.com/signup is an internal link, however it was typed.
      if (isOwnSite(parsed)) {
        return { href: `${parsed.pathname}${parsed.search}${parsed.hash}`, external: false };
      }

      return { href: parsed.toString(), external: true };
    }
  } catch {
    // fall through
  }

  return null;
}

// Not /g on purpose: parseInline recurses, and a shared global regex would have
// its lastIndex clobbered by the inner call. Each call builds its own copy.
const INLINE_RE =
  /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)|`([^`]+)`|\*(?!\s)([^*]+?)\*|!\[([^\]]*)\]\(([^)\s]+)\)/;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  const re = new RegExp(INLINE_RE.source, "g");
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ t: "text", v: text.slice(last, m.index) });

    if (m[1] !== undefined) {
      out.push({ t: "strong", c: parseInline(m[1]) });
    } else if (m[2] !== undefined) {
      const link = safeLink(m[3]);
      if (link) {
        out.push({ t: "link", ...link, c: parseInline(m[2]) });
      } else {
        out.push({ t: "text", v: m[2] });
      }
    } else if (m[4] !== undefined) {
      out.push({ t: "code", v: m[4] });
    } else if (m[5] !== undefined) {
      out.push({ t: "em", c: parseInline(m[5]) });
    } else if (m[6] !== undefined) {
      // An image in the middle of a sentence is not rendered (images are
      // block-level, on their own line); keep its description as plain text
      // so it is never parsed as a link with a stray "!".
      if (m[6]) out.push({ t: "text", v: m[6] });
    }

    last = m.index + m[0].length;
  }

  if (last < text.length) out.push({ t: "text", v: text.slice(last) });

  return out;
}

export function inlineToText(nodes: Inline[]): string {
  return nodes
    .map((n) => (n.t === "text" || n.t === "code" ? n.v : inlineToText(n.c)))
    .join("");
}

function headingId(text: string, used: Map<string, number>): string {
  const base =
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "section";
  const n = used.get(base) ?? 0;
  used.set(base, n + 1);

  return n === 0 ? base : `${base}-${n + 1}`;
}

const IMG_LINE_RE = /^\s*!\[([^\]]*)\]\(([^)\s]+)\)\s*$/;
const UL_RE = /^\s*[-*]\s+(.*)$/;
const OL_RE = /^\s*\d+[.)]\s+(.*)$/;

export function parseMarkdown(source: string): ParsedMarkdown {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  const headings: Heading[] = [];
  const usedIds = new Map<string, number>();

  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    if (/^\s*(---|\*\*\*)\s*$/.test(line)) {
      blocks.push({ t: "hr" });
      i++;
      continue;
    }

    const image = IMG_LINE_RE.exec(line);
    if (image) {
      // Only images uploaded through the editor are rendered; anything else is dropped.
      const src = image[2].trim();
      if (isBlogImageUrl(src)) blocks.push({ t: "img", src, alt: image[1].trim() });
      i++;
      continue;
    }

    const heading = /^(#{1,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading) {
      const level = heading[1].length === 3 ? 3 : 2;
      const c = parseInline(heading[2]);
      const text = inlineToText(c);
      const id = headingId(text, usedIds);
      blocks.push({ t: level === 2 ? "h2" : "h3", id, c, text });
      headings.push({ id, level, text });
      i++;
      continue;
    }

    if (UL_RE.test(line) || OL_RE.test(line)) {
      const ordered = OL_RE.test(line) && !UL_RE.test(line);
      const re = ordered ? OL_RE : UL_RE;
      const items: Inline[][] = [];

      while (i < lines.length) {
        const item = re.exec(lines[i]);
        if (!item) break;
        items.push(parseInline(item[1]));
        i++;
      }

      blocks.push({ t: ordered ? "ol" : "ul", items });
      continue;
    }

    if (/^\s*>/.test(line)) {
      const quoted: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        quoted.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      blocks.push({ t: "quote", c: parseInline(quoted.join(" ")) });
      continue;
    }

    // Paragraph: consume until a blank line or the start of another block.
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !UL_RE.test(lines[i]) &&
      !OL_RE.test(lines[i]) &&
      !IMG_LINE_RE.test(lines[i]) &&
      !/^\s*>/.test(lines[i]) &&
      !/^\s*(---|\*\*\*)\s*$/.test(lines[i])
    ) {
      para.push(lines[i].trim());
      i++;
    }
    blocks.push({ t: "p", c: parseInline(para.join(" ")) });
  }

  return { blocks, headings };
}

/** Visible text of every block (link text yes, URLs no, images no). */
export function blocksToText(blocks: Block[]): string {
  return blocks
    .map((b) => {
      switch (b.t) {
        case "h2":
        case "h3":
          return b.text;
        case "p":
        case "quote":
          return inlineToText(b.c);
        case "ul":
        case "ol":
          return b.items.map(inlineToText).join(" ");
        default:
          return "";
      }
    })
    .join(" ");
}

function linksIn(nodes: Inline[], acc: { internal: number; external: number }) {
  for (const n of nodes) {
    if (n.t === "link") {
      if (n.external) acc.external++;
      else acc.internal++;
    }
    if (n.t === "strong" || n.t === "em" || n.t === "link") linksIn(n.c, acc);
  }
}

/** Links exactly as they render: what the reader sees is what gets counted. */
export function countLinks(blocks: Block[]): { internal: number; external: number } {
  const acc = { internal: 0, external: 0 };

  for (const b of blocks) {
    if (b.t === "p" || b.t === "quote" || b.t === "h2" || b.t === "h3") linksIn(b.c, acc);
    if (b.t === "ul" || b.t === "ol") b.items.forEach((item) => linksIn(item, acc));
  }

  return acc;
}

export function countImages(blocks: Block[]): number {
  return blocks.filter((b) => b.t === "img").length;
}
