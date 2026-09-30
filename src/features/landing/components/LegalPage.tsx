import Link from "next/link";
import type { ReactNode } from "react";
import LandingFooter from "./LandingFooter";
import LandingHeader from "./LandingHeader";
import type { LegalDocument } from "../legal/types";
import "../styles/landing.css";

const TOKEN_RE = /\[\[(.+?)\|(.+?)\]\]|\*\*(.+?)\*\*/g;

/** Turns `[[label|/path]]` into a link and `**text**` into bold; the rest stays plain text. */
function renderText(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN_RE)) {
    const index = m.index ?? 0;
    if (index > last) out.push(text.slice(last, index));
    if (m[3] !== undefined) {
      out.push(<b key={index}>{m[3]}</b>);
    } else {
      const [, label, href] = m;
      out.push(
        href.startsWith("/") ? (
          <Link key={index} href={href}>
            {label}
          </Link>
        ) : (
          <a key={index} href={href}>
            {label}
          </a>
        ),
      );
    }
    last = index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Public legal document ("/terms", "/privacy", "/refunds"). Static, server-rendered. */
export default function LegalPage({ doc }: { doc: LegalDocument }) {
  return (
    <div className="lh">
      <a className="skip" href="#main">
        Skip to content
      </a>

      <LandingHeader />

      <main id="main">
        <section className="pagehead">
          <div className="wrap">
            <h1>{doc.title}</h1>
            <p className="lede">{doc.subtitle}</p>
            <p className="policy-updated">Last updated: {doc.lastUpdated}</p>
          </div>
        </section>

        <section className="policy">
          <div className="wrap">
            <nav className="policy-toc" aria-label="On this page">
              <b>On this page</b>
              <ol>
                {doc.sections.map((s, i) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`}>
                      {i + 1}. {s.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            <article className="policy-body">
              {doc.sections.map((s, i) => (
                <div key={s.id} id={s.id} className="policy-sec">
                  <h2>
                    {i + 1}. {s.title}
                  </h2>
                  {s.clauses.map((c, j) => (
                    <div className="clause" key={j}>
                      <p>
                        <span className="num">
                          {i + 1}.{j + 1}
                        </span>
                        {c.lead && <b>{c.lead} </b>}
                        {renderText(c.text)}
                      </p>
                      {c.bullets && (
                        <ul>
                          {c.bullets.map((b, k) => (
                            <li key={k}>{renderText(b)}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </article>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
