import Link from "next/link";
import type { ReactNode } from "react";

import { parseMarkdown, type Inline, type ParsedMarkdown } from "../utils/markdown";

function renderInline(nodes: Inline[]): ReactNode[] {
  return nodes.map((n, i) => {
    switch (n.t) {
      case "text":
        return n.v;
      case "strong":
        return <strong key={i}>{renderInline(n.c)}</strong>;
      case "em":
        return <em key={i}>{renderInline(n.c)}</em>;
      case "code":
        return <code key={i}>{n.v}</code>;
      case "link":
        // Internal links keep link equity; anything user-supplied and
        // external is nofollow + ugc so the blog can't be used for link spam.
        return n.external ? (
          <a key={i} href={n.href} rel="nofollow ugc noopener noreferrer" target="_blank">
            {renderInline(n.c)}
          </a>
        ) : (
          <Link key={i} href={n.href}>
            {renderInline(n.c)}
          </Link>
        );
    }
  });
}

/**
 * Renders parsed Markdown-lite as React elements (no dangerouslySetInnerHTML).
 * Hook-free so it works in both the server article page and the client-side
 * editor preview.
 */
export default function BlogContent({
  markdown,
  parsed,
}: {
  markdown?: string;
  parsed?: ParsedMarkdown;
}) {
  const { blocks } = parsed ?? parseMarkdown(markdown ?? "");

  return (
    <div className="blog-prose">
      {blocks.map((b, i) => {
        switch (b.t) {
          case "h2":
            return (
              <h2 key={i} id={b.id}>
                {renderInline(b.c)}
              </h2>
            );
          case "h3":
            return (
              <h3 key={i} id={b.id}>
                {renderInline(b.c)}
              </h3>
            );
          case "p":
            return <p key={i}>{renderInline(b.c)}</p>;
          case "ul":
            return (
              <ul key={i}>
                {b.items.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i}>
                {b.items.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </ol>
            );
          case "quote":
            return <blockquote key={i}>{renderInline(b.c)}</blockquote>;
          case "hr":
            return <hr key={i} />;
        }
      })}
    </div>
  );
}
