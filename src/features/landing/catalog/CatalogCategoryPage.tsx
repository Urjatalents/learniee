import CatalogView from "./CatalogView";
import { fetchApprovedCourses, toCourseCards } from "./catalog.service";
import { matchesFilter } from "./filter";
import { catalogRoot, listCatalogPages, type CatalogPage } from "./pages";

/** Classes shown on a category page; the rest are one click away on /courses. */
const MAX_SHOWN = 24;
/** "Other classes" shown when a category has none. */
const MAX_OTHERS = 12;

/**
 * One public category page (age, grade, board, language, subject, format or
 * counselling topic). Auto-filters the approved classes; when none match it
 * shows other classes plus the "Request a class" call to action.
 */
export default async function CatalogCategoryPage({ page }: { page: CatalogPage }) {
  const all = await fetchApprovedCourses();
  const matchedRows = all.filter((c) => matchesFilter(c, page.filter));
  const shownRows = matchedRows.slice(0, MAX_SHOWN);
  const otherRows = matchedRows.length === 0 ? all.slice(0, MAX_OTHERS) : [];

  const [matched, others] = await Promise.all([toCourseCards(shownRows), toCourseCards(otherRows)]);
  const root = catalogRoot(page.kind);

  return (
    <CatalogView
      breadcrumb={[{ label: root.label, href: root.href }, { label: page.label }]}
      heading={page.heading}
      intro={page.intro}
      subjectLabel={page.label}
      prefill={page.request}
      matched={matched}
      totalMatched={matchedRows.length}
      others={others}
      moreHref={`/courses?q=${encodeURIComponent(page.label)}`}
      related={[
        {
          title: `Explore more ${page.kind === "counselling" ? "counselling" : "classes"}`,
          pages: listCatalogPages(page.kind).filter((p) => p.slug !== page.slug),
        },
      ]}
    />
  );
}
