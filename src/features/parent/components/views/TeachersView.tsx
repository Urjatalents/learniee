"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Search, SearchX, Star } from "lucide-react";

import { useApprovedCourses } from "@/features/parent/hooks/useApprovedCourses";
import { Tag } from "@/features/parent/components/home/HomeBits";
import {
  GridSkeleton,
  PD_BTN_SEC,
  PD_BTN_SEC_SM,
  PD_SEARCH_INPUT,
  PdEmpty,
  coursePrice,
  pillFilter,
  rupees,
  teacherDisplayName,
} from "@/features/parent/components/courses/pdUi";

interface TeacherSummary {
  id: string;
  name: string;
  photoUrl: string | null;
  city: string;
  qualifications: string | null;
  experience: string | null;
  isIITian: boolean;
  rating: number | null;
  reviewCount: number;
  courseCount: number;
  minPrice: number;
  subjects: string[];
}

type SortKey = "rating" | "exp" | "name";
const MAX_CHIPS = 3;

/** "8" -> "8 yrs"; anything non-numeric is shown as typed. */
function formatExperience(value: string | null): string {
  const text = value?.trim();
  if (!text) return "—";
  return /^\d+(\.\d+)?$/.test(text) ? `${text} yrs` : text;
}

function TeacherCard({ t }: { t: TeacherSummary }) {
  return (
    <article className="flex min-w-0 flex-col gap-3.5 rounded-[18px] border border-pd-line bg-white p-5 transition-colors hover:border-pd-b100">
      <div className="flex items-center gap-3.5">
        {t.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={t.photoUrl} alt="" className="size-[52px] shrink-0 rounded-full object-cover" />
        ) : (
          <span className="grid size-[52px] shrink-0 place-items-center rounded-full bg-pd-b100 text-xl font-semibold text-pd-brand-d">
            {t.name[0]}
          </span>
        )}
        <div className="flex min-w-0 flex-col gap-0.5">
          <b className="flex items-center gap-1.5 text-[17px] font-semibold">
            <span className="truncate">{t.name}</span>
            {t.isIITian && (
              <BadgeCheck size={15} aria-label="IITian" className="shrink-0 text-pd-brand" />
            )}
          </b>
          {t.rating !== null ? (
            <span className="inline-flex items-center gap-[5px] text-[13px] text-pd-ink2">
              <Star size={13} className="fill-[#f59e0b] text-[#f59e0b]" />
              <b className="font-bold text-pd-ink">{t.rating.toFixed(1)}</b>
              <small className="text-xs text-pd-ink3">
                {t.reviewCount} review{t.reviewCount === 1 ? "" : "s"}
              </small>
            </span>
          ) : (
            <span className="inline-flex items-center gap-[5px] text-[13px] text-pd-ink3">
              <Tag tone="green">New</Tag> No reviews yet
            </span>
          )}
        </div>
      </div>

      {t.qualifications && (
        <p className="text-sm font-semibold leading-[1.4] text-pd-ink">{t.qualifications}</p>
      )}

      <dl className="grid grid-cols-[1fr_1fr_1.3fr] gap-2">
        {[
          ["Experience", formatExperience(t.experience)],
          ["Courses", String(t.courseCount)],
          ["City", t.city || "—"],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-[10px] bg-pd-bg px-2.5 py-2">
            <dt className="text-[11px] font-semibold text-pd-ink3">{label}</dt>
            <dd className="truncate text-sm font-semibold text-pd-ink">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap gap-1.5">
        {t.subjects.slice(0, MAX_CHIPS).map((s) => (
          <span key={s} className="rounded-full bg-pd-b50 px-[11px] py-1 text-xs font-semibold text-pd-brand-d">
            {s}
          </span>
        ))}
        {t.subjects.length > MAX_CHIPS && (
          <span className="rounded-full bg-pd-bg px-[11px] py-1 text-xs font-semibold text-pd-ink3">
            +{t.subjects.length - MAX_CHIPS}
          </span>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-pd-line pt-3.5 text-[13px] text-pd-ink3">
        <span>
          {t.minPrice ? (
            <>
              From <b className="font-semibold text-pd-ink">{rupees(t.minPrice)}</b>/session
            </>
          ) : (
            "No courses yet"
          )}
        </span>
        <Link href={`/parent/teachers/${t.id}`} className={PD_BTN_SEC_SM}>
          View profile
        </Link>
      </div>
    </article>
  );
}

/**
 * "Teachers" tab. There is no teacher-directory API, so the list is built from
 * the teachers behind the approved courses the parent can already see.
 */
export default function TeachersView() {
  const { courses, loading, error } = useApprovedCourses();
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState("All");
  const [sort, setSort] = useState<SortKey>("rating");

  const teachers = useMemo(() => {
    const map = new Map<string, TeacherSummary & { subjectSet: Set<string> }>();
    for (const c of courses) {
      const t = c.teacher;
      const price = coursePrice(c.price);
      const e =
        map.get(c.teacherId) ??
        {
          id: c.teacherId,
          name: teacherDisplayName(t),
          photoUrl: t.photoUrl ?? null,
          city: t.city ?? "",
          qualifications: t.qualifications ?? null,
          experience: t.experience ?? null,
          isIITian: t.isIITian ?? false,
          rating: t.averageRating,
          reviewCount: t.reviewCount,
          courseCount: 0,
          minPrice: 0,
          subjects: [],
          subjectSet: new Set<string>(),
        };
      e.courseCount += 1;
      if (price) e.minPrice = e.minPrice ? Math.min(e.minPrice, price) : price;
      if (c.subject) e.subjectSet.add(c.subject);
      map.set(c.teacherId, e);
    }
    return [...map.values()].map(({ subjectSet, ...rest }) => ({
      ...rest,
      subjects: [...subjectSet].sort(),
    }));
  }, [courses]);

  const subjects = useMemo(
    () => ["All", ...[...new Set(teachers.flatMap((t) => t.subjects))].sort()],
    [teachers],
  );
  const activeSubject = subjects.includes(subject) ? subject : "All";

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const l = teachers.filter(
      (t) =>
        (activeSubject === "All" || t.subjects.includes(activeSubject)) &&
        (!needle ||
          `${t.name} ${t.subjects.join(" ")} ${t.qualifications ?? ""}`.toLowerCase().includes(needle)),
    );
    const years = (t: TeacherSummary) => parseFloat(t.experience ?? "") || 0;
    return l.sort(
      sort === "exp"
        ? (a, b) => years(b) - years(a)
        : sort === "name"
          ? (a, b) => a.name.localeCompare(b.name)
          : (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.reviewCount - a.reviewCount,
    );
  }, [teachers, q, activeSubject, sort]);

  return (
    <div>
      <div className="mb-3 mt-5 flex flex-wrap gap-2.5">
        <div className="relative min-w-0 flex-[1_1_260px]">
          <Search
            size={18}
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-pd-ink3"
          />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or subject"
            aria-label="Search teachers"
            className={PD_SEARCH_INPUT}
          />
        </div>
        <label>
          <span className="sr-only">Sort by</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort teachers"
            className="h-11 rounded-full border border-pd-line bg-white px-3.5 text-sm font-semibold text-pd-ink2 outline-none focus:border-pd-brand focus:ring-4 focus:ring-pd-b100"
          >
            <option value="rating">Top rated</option>
            <option value="exp">Most experienced</option>
            <option value="name">Name A–Z</option>
          </select>
        </label>
      </div>

      {subjects.length > 1 && (
        <div role="group" aria-label="Subject" className="mb-3 flex flex-wrap gap-2">
          {subjects.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={activeSubject === s}
              onClick={() => setSubject(s)}
              className={pillFilter(activeSubject === s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-xl bg-pd-red-bg px-4 py-3 text-sm font-semibold text-pd-red">
          {error}
        </p>
      )}

      {loading ? (
        <GridSkeleton height={260} />
      ) : (
        <>
          <p className="mb-3 mt-1 text-[13px] text-pd-ink3">
            {list.length} teacher{list.length === 1 ? "" : "s"}
          </p>
          {list.length === 0 ? (
            <PdEmpty
              icon={SearchX}
              title="No teachers match"
              text="Try another subject or search term."
              action={
                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    setSubject("All");
                  }}
                  className={PD_BTN_SEC}
                >
                  Clear filters
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 min-[1180px]:grid-cols-3">
              {list.map((t) => (
                <TeacherCard key={t.id} t={t} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
