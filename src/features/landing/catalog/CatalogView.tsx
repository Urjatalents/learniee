import Link from "next/link";

import CloseCta from "../components/CloseCta";
import LandingFooter from "../components/LandingFooter";
import LandingHeader from "../components/LandingHeader";
import CatalogCourseCardView from "./CatalogCourseCard";
import CatalogSearch from "./CatalogSearch";
import RequestClassCta from "./RequestClassCta";
import type { CatalogCourseCard } from "./catalog.service";
import { catalogHref, type CatalogPage } from "./pages";
import type { RequestPrefill } from "./requestClassLink";
import "../styles/landing.css";
import "../styles/catalog.css";

export interface CatalogViewProps {
  breadcrumb: { label: string; href?: string }[];
  heading: string;
  intro: string;
  /** Short name used in the empty state, e.g. "5 Year Olds". */
  subjectLabel: string;
  prefill: RequestPrefill;
  matched: CatalogCourseCard[];
  totalMatched: number;
  /** Shown only when nothing matched. */
  others: CatalogCourseCard[];
  related?: { title: string; pages: CatalogPage[] }[];
  /** Renders the search box (the /courses page). */
  search?: { q: string };
  moreHref?: string;
  pager?: { page: number; pageCount: number; prevHref?: string; nextHref?: string };
}

/** Shared layout for every public class page (server component). */
export default function CatalogView({
  breadcrumb,
  heading,
  intro,
  subjectLabel,
  prefill,
  matched,
  totalMatched,
  others,
  related = [],
  search,
  moreHref,
  pager,
}: CatalogViewProps) {
  const empty = matched.length === 0;

  return (
    <div className="lh">
      <a className="skip" href="#main">
        Skip to content
      </a>

      <LandingHeader />

      <main id="main">
        <section className="pagehead cathead">
          <div className="wrap">
            <nav className="crumbs" aria-label="Breadcrumb">
              <Link href="/">Home</Link>
              {breadcrumb.map((b) => (
                <span key={b.label}>
                  <span aria-hidden="true"> / </span>
                  {b.href ? <Link href={b.href}>{b.label}</Link> : <span aria-current="page">{b.label}</span>}
                </span>
              ))}
            </nav>
            <h1>{heading}</h1>
            <p className="lede">{intro}</p>
            <ul className="cat-points">
              <li>Live classes, 1-to-1 tutoring and small groups</li>
              <li>Hand-picked teachers who pass a 3% selection bar</li>
              <li>Two free demos on every account</li>
            </ul>
            {search && <CatalogSearch defaultValue={search.q} />}
            <div className="cta">
              <Link className="btn" href="/signup">
                Book a free demo
              </Link>
              <RequestClassCta prefill={prefill} label="Request a class" className="btn ghost" />
            </div>
          </div>
        </section>

        <section className="catlist">
          <div className="wrap">
            {empty ? (
              <div className="cat-empty" role="status">
                <h2>No {subjectLabel} classes yet</h2>
                <p>
                  We don&apos;t have a live class for this right now. Tell us what you&apos;re looking for and
                  we&apos;ll ask our teachers to list one.
                </p>
                <RequestClassCta prefill={prefill} label="Request this class" showHint />
              </div>
            ) : (
              <>
                <h2 className="cat-count">
                  {totalMatched} {totalMatched === 1 ? "class" : "classes"} available
                </h2>
                <div className="cgrid">
                  {matched.map((c) => (
                    <CatalogCourseCardView key={c.id} course={c} />
                  ))}
                </div>
                {pager && pager.pageCount > 1 && (
                  <nav className="cat-pager" aria-label="Pages">
                    {pager.prevHref ? <Link href={pager.prevHref}>← Previous</Link> : <span />}
                    <span>
                      Page {pager.page} of {pager.pageCount}
                    </span>
                    {pager.nextHref ? <Link href={pager.nextHref}>Next →</Link> : <span />}
                  </nav>
                )}
                {moreHref && totalMatched > matched.length && (
                  <Link className="btn solid more" href={moreHref}>
                    View all {totalMatched} classes
                  </Link>
                )}
              </>
            )}

            {empty && others.length > 0 && (
              <>
                <h2 className="cat-count cat-others">Other classes you may like</h2>
                <div className="cgrid">
                  {others.map((c) => (
                    <CatalogCourseCardView key={c.id} course={c} />
                  ))}
                </div>
                <Link className="btn solid more" href="/courses">
                  Browse all classes
                </Link>
              </>
            )}
          </div>
        </section>

        {!empty && (
          <section className="catask">
            <div className="wrap">
              <h2>Can&apos;t find the right class?</h2>
              <p className="lede">Tell us what your child needs and we&apos;ll find a teacher for it.</p>
              <RequestClassCta prefill={prefill} label="Request a class" showHint />
            </div>
          </section>
        )}

        {related.map((group) =>
          group.pages.length > 0 ? (
            <section className="catexplore" key={group.title}>
              <div className="wrap">
                <h2>{group.title}</h2>
                <ul className="chips">
                  {group.pages.map((p) => (
                    <li key={`${p.kind}-${p.slug}`}>
                      <Link href={catalogHref(p)} prefetch={false}>
                        {p.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null,
        )}

        <CloseCta />
      </main>

      <LandingFooter />
    </div>
  );
}
