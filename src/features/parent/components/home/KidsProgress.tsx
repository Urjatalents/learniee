import Link from "next/link";

import { KidAvatar, Section, Tag, kcStyle } from "./HomeBits";
import { dayDiff, dayLabel, gradeLabel, kidColor, type LearnerFilter } from "./homeLogic";
import type { HomeData } from "./homeTypes";

export default function KidsProgress({
  data,
  filter,
  now,
}: {
  data: HomeData;
  filter: LearnerFilter;
  now: Date;
}) {
  const kids = data.kids.filter((k) => filter === "all" || k.id === filter);
  if (!kids.length) return null;
  const one = kids.length === 1;

  return (
    <Section id="home-kids" title={`How ${one ? kids[0].first + " is" : "they’re"} doing`}>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3">
        {kids.map((k) => {
          const color = kidColor(data.kids, k.id);
          const classes = data.classes.filter((c) => c.kidId === k.id && c.status === "enrolled");
          const hw = data.homework
            .filter((h) => h.kidId === k.id && classes.some((c) => c.id === h.classId))
            .sort((a, b) => (a.due?.getTime() ?? Infinity) - (b.due?.getTime() ?? Infinity));
          const late = hw.filter((h) => h.due && dayDiff(h.due, now) < 0).length;
          const shown = hw.slice(0, one ? 4 : 2);

          return (
            <div
              key={k.id}
              style={kcStyle(color)}
              className="flex min-w-0 flex-col gap-2.5 rounded-[14px] border border-pd-line bg-white p-4"
            >
              <div className="flex flex-wrap items-center gap-3">
                <KidAvatar name={k.first} color={color} />
                <div className="min-w-0 flex-[1_1_130px]">
                  <b className="block font-heading text-[17px] font-bold">{k.first}</b>
                  <small className="whitespace-nowrap text-[13px] text-pd-ink3">
                    {[gradeLabel(k), `${classes.length} class${classes.length === 1 ? "" : "es"}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </small>
                </div>
                <Tag tone={hw.length ? (late ? "red" : "gray") : "green"} className="ml-auto">
                  {hw.length ? `${hw.length} homework due` : "Homework done"}
                </Tag>
              </div>

              {one &&
                classes.map((c) => (
                  <div
                    key={c.id}
                    className="grid grid-cols-[96px_1fr_40px] items-center gap-2.5 text-[13px] text-pd-ink2"
                  >
                    <span className="truncate">{c.subject}</span>
                    <div className="h-2 overflow-hidden rounded-full bg-pd-b100">
                      <i
                        className="block h-full rounded-full bg-(--kc)"
                        style={{ width: `${c.total ? Math.min(100, Math.round((c.done / c.total) * 100)) : 0}%` }}
                      />
                    </div>
                    <small className="text-right text-pd-ink3">
                      {c.done}/{c.total}
                    </small>
                  </div>
                ))}

              {shown.map((h) => (
                <Link
                  key={h.id}
                  href="/parent/homework-tests"
                  className="flex w-full min-w-0 flex-col items-start rounded-[10px] bg-pd-bg px-3 py-2.5 text-left text-sm font-medium hover:bg-pd-b50"
                >
                  <span className="max-w-full truncate">{h.title}</span>
                  <small className="text-xs text-pd-ink3">
                    {h.subject} ·{" "}
                    {!h.due ? "No due date" : dayDiff(h.due, now) < 0 ? "Overdue" : dayLabel(h.due, now)}
                  </small>
                </Link>
              ))}
            </div>
          );
        })}
      </div>
    </Section>
  );
}
