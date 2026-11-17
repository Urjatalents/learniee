import Link from "next/link";

import { BTN_PRI, RatingBadge, Section, Tag, NeutralAvatar, kcStyle } from "./HomeBits";
import { SUBJECT_COLOR, inr, kidColor, pickRecommendations, type LearnerFilter } from "./homeLogic";
import type { HomeData } from "./homeTypes";

export default function RecommendedCourses({
  data,
  filter,
}: {
  data: HomeData;
  filter: LearnerFilter;
}) {
  const kids = data.kids.filter((k) => filter === "all" || k.id === filter);
  const recs = pickRecommendations(data, filter, 3);
  if (!recs.length) return null;

  const one = kids.length === 1;

  return (
    <Section
      id="home-recs"
      title={`Courses for ${one ? kids[0].first : "your children"}`}
      action={
        <Link
          href="/parent/courses"
          className="rounded-lg px-2 py-1 font-sans text-[13px] font-semibold text-pd-brand hover:bg-pd-b50"
        >
          Browse all
        </Link>
      }
    >
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,210px),1fr))] gap-3">
        {recs.map(({ course, kid }) => (
          <article
            key={course.id}
            style={{ "--sc": SUBJECT_COLOR[course.subject] ?? "#5931a2" } as React.CSSProperties}
            className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-pd-line bg-white transition-colors hover:border-pd-line2"
          >
            <div className="relative flex h-[88px] items-start justify-between overflow-hidden bg-(--sc) p-3.5">
              <span className="absolute -bottom-[26px] right-3.5 text-[92px] font-bold leading-none text-white/20">
                {course.subject[0]}
              </span>
              <Tag tone="violet" className="relative !bg-white/90 !text-(--sc)">
                {course.subject}
              </Tag>
              <RatingBadge rating={course.rating} />
            </div>

            <div className="flex flex-1 flex-col gap-3 px-[18px] pb-[18px] pt-4">
              <h3 className="line-clamp-2 font-heading text-[15px] font-semibold leading-[1.4]">
                {course.title}
              </h3>

              <div className="flex items-center gap-2 text-[13px] font-bold text-pd-ink2">
                <NeutralAvatar name={course.teacherName} small />
                <span className="truncate">{course.teacherName}</span>
              </div>

              {!one && (
                <p
                  style={kcStyle(kidColor(data.kids, kid.id))}
                  className="flex items-center gap-1.5 text-xs font-semibold text-pd-ink2"
                >
                  <i className="size-2 rounded-full bg-(--kc)" />
                  For {kid.first} · Grade {kid.grade}
                </p>
              )}

              <div className="mt-auto flex items-center justify-between gap-2">
                <span className="text-lg font-semibold">
                  {inr(course.price)}
                  <small className="text-xs font-bold text-pd-ink3">/session</small>
                </span>
                <Link href="/parent/courses" className={BTN_PRI}>
                  Enroll
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}
