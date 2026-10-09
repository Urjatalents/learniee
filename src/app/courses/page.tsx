import type { Metadata } from "next";

import CatalogView from "@/features/landing/catalog/CatalogView";
import { fetchApprovedCourses, toCourseCards } from "@/features/landing/catalog/catalog.service";
import { matchesQuery } from "@/features/landing/catalog/filter";
import { listCatalogPages } from "@/features/landing/catalog/pages";

/** "Browse classes" — every approved class, with an optional ?q= search (footer "Can't find a course?"). */

const PAGE_SIZE = 24;
const MAX_OTHERS = 12;

type SearchParams = Promise<{ q?: string | string[]; page?: string | string[] }>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const q = first((await searchParams).q).trim();
  return {
    title: q ? `“${q.slice(0, 60)}” classes | Learniee` : "Browse online classes | Learniee",
    description:
      "Live online classes and tutoring for ages 3 to 18: school subjects, hobbies and exam prep, with two free demos.",
    alternates: { canonical: "/courses" },
    // Search-result pages are thin duplicates: keep them out of the index.
    ...(q ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function CoursesPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = first(sp.q).trim().slice(0, 100);
  const requestedPage = Math.max(1, Math.floor(Number(first(sp.page))) || 1);

  const all = await fetchApprovedCourses();
  const matchedRows = q ? all.filter((c) => matchesQuery(c, q)) : all;

  const pageCount = Math.max(1, Math.ceil(matchedRows.length / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  const shownRows = matchedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const otherRows = matchedRows.length === 0 ? all.slice(0, MAX_OTHERS) : [];

  const [matched, others] = await Promise.all([toCourseCards(shownRows), toCourseCards(otherRows)]);

  const hrefFor = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/courses?${qs}` : "/courses";
  };

  return (
    <CatalogView
      breadcrumb={[{ label: q ? "Search" : "Classes" }]}
      heading={q ? `Classes for “${q}”` : "Online classes for ages 3 to 18"}
      intro={
        q
          ? "Classes matching your search. Not what you need? Request a class and we'll find a teacher."
          : "Browse live one-to-one and group classes taught by hand-picked teachers. Every class starts with a free demo."
      }
      subjectLabel={q ? `“${q}”` : "matching"}
      prefill={{ title: q || "Class request", subject: q || undefined }}
      matched={matched}
      totalMatched={matchedRows.length}
      others={others}
      search={{ q }}
      pager={{
        page,
        pageCount,
        prevHref: page > 1 ? hrefFor(page - 1) : undefined,
        nextHref: page < pageCount ? hrefFor(page + 1) : undefined,
      }}
      related={[
        { title: "Browse by format", pages: listCatalogPages("format") },
        { title: "Browse by subject", pages: listCatalogPages("subject").slice(0, 16) },
        { title: "Browse by grade", pages: listCatalogPages("grade") },
      ]}
    />
  );
}
