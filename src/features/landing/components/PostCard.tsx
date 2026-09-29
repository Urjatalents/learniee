import Link from "next/link";
import { formatPostDate, type BlogPost } from "../blogPosts";

// Card art cycles through the three illustrations from the design.
const ART = [
  {
    bg: "var(--lav-400)",
    svg: (
      <>
        <rect x="50" y="36" width="100" height="24" rx="4" />
        <rect x="62" y="64" width="90" height="24" rx="4" />
        <rect x="46" y="92" width="106" height="24" rx="4" />
      </>
    ),
  },
  {
    bg: "var(--sun)",
    svg: (
      <>
        <circle cx="100" cy="68" r="28" />
        <path d="M88 102h24M91 112h18M100 22v-8M60 32l-6-6M140 32l6-6" />
      </>
    ),
  },
  {
    bg: "var(--lav-200)",
    svg: <path d="M100 24l11 31 31 11-31 11-11 31-11-31-31-11 31-11z" />,
  },
] as const;

export default function PostCard({
  post,
  index,
  showExcerpt = false,
}: {
  post: BlogPost;
  index: number;
  showExcerpt?: boolean;
}) {
  const art = ART[index % ART.length];
  // In-app posts have a site-relative url; the legacy demo posts point at learniee.com.
  const internal = post.url.startsWith("/");
  const body = (
    <>
      <div className="img" style={{ background: art.bg }}>
        <svg viewBox="0 0 200 150" aria-hidden="true">
          {art.svg}
        </svg>
      </div>
      <div className="b">
        <span className="tag">{post.tag}</span>
        <h3>{post.title}</h3>
        {showExcerpt && <p>{post.excerpt}</p>}
        <small>
          <time dateTime={post.date}>{formatPostDate(post.date)}</time>
          {!internal && <span className="sr-only"> (opens in a new tab)</span>}
        </small>
      </div>
    </>
  );

  return (
    <article className="post">
      {internal ? (
        <Link href={post.url}>{body}</Link>
      ) : (
        <a href={post.url} target="_blank" rel="noopener noreferrer">
          {body}
        </a>
      )}
    </article>
  );
}
