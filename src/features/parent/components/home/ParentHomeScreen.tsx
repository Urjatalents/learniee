"use client";

import { useEffect, useMemo, useState } from "react";

import { useDashboard } from "@/features/parent/hooks/useDashboard";

import AttentionList from "./AttentionList";
import DemoStrip from "./DemoStrip";
import HomeLearnerSwitcher from "./HomeLearnerSwitcher";
import KidsProgress from "./KidsProgress";
import MessagesCard from "./MessagesCard";
import RecommendedCourses from "./RecommendedCourses";
import SetupCard from "./SetupCard";
import UpNextHero from "./UpNextHero";
import WalletCard from "./WalletCard";
import WeekAgenda from "./WeekAgenda";
import { attentionItems, countdown, upcomingSessions, type LearnerFilter } from "./homeLogic";
import { toHomeData } from "./homeAdapter";

function HomeSkeleton() {
  const bar = (h: number, w = "100%") => (
    <div className="animate-pulse rounded-[14px] bg-[#eeeaf7]" style={{ height: h, width: w }} />
  );
  return (
    <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-5">
      {bar(34, "50%")}
      {bar(18, "30%")}
      {bar(150, "100%")}
      {bar(180)}
      {bar(220)}
    </div>
  );
}

export default function ParentHomeScreen() {
  const { data: raw, loading, error, skewMs, reload } = useDashboard();
  const data = useMemo(() => (raw ? toHomeData(raw) : null), [raw]);

  // Time-dependent UI renders only after mount (avoids server/client mismatch);
  // it ticks every second for the live countdown and follows the server clock.
  const [now, setNow] = useState<Date | null>(null);
  const [selected, setSelected] = useState<LearnerFilter>("all");

  useEffect(() => {
    const tick = () => setNow(new Date(Date.now() + skewMs));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [skewMs]);

  if (error && !data) {
    return (
      <div className="mx-auto max-w-[1160px] px-4 pb-12 pt-6 sm:px-6 sm:pt-8">
        <div className="rounded-2xl border border-pd-line bg-white p-6 text-sm text-pd-ink2">
          <p className="font-semibold text-pd-ink">{error}</p>
          <button
            type="button"
            onClick={() => reload()}
            className="mt-3 rounded-full bg-pd-brand px-4 py-2 font-semibold text-white hover:bg-pd-brand-d"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="mx-auto max-w-[1160px] px-4 pb-12 pt-6 sm:px-6 sm:pt-8">
        <HomeSkeleton />
      </div>
    );
  }

  if (!now || !data) {
    return (
      <div className="mx-auto max-w-[1160px] px-4 pb-12 pt-6 sm:px-6 sm:pt-8">
        <HomeSkeleton />
      </div>
    );
  }

  // A learner removed elsewhere falls back to "All".
  const filter: LearnerFilter =
    selected === "all" || data.kids.some((k) => k.id === selected) ? selected : "all";
  const setFilter = setSelected;

  const upcoming = upcomingSessions(data, filter, now);
  const hero = upcoming[0];
  const attention = attentionItems(data, filter);
  const heroOpen = !!hero && countdown(hero.start, now).open;
  const urgent = attention.length > 0;

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const heroBlock = (
    <>
      <UpNextHero data={data} session={hero} now={now} />
      <DemoStrip data={data} filter={filter} now={now} heroSession={hero} />
    </>
  );

  return (
    <div className="mx-auto max-w-[1160px] px-4 pb-12 pt-6 sm:px-6 sm:pt-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-[26px] font-semibold leading-[1.15] text-pd-ink outline-none sm:text-[32px]">
            {greeting}
            {data.firstName ? (
              <>
                , <span className="text-pd-brand">{data.firstName}</span>
              </>
            ) : null}
          </h1>
          <p className="text-sm text-pd-ink3">
            {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
      </div>

      <HomeLearnerSwitcher kids={data.kids} active={filter} onSelect={setFilter} />

      <div className="mt-6 grid grid-cols-1 items-start gap-6 min-[1180px]:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          {urgent && !heroOpen ? (
            <>
              <AttentionList items={attention} />
              <div>{heroBlock}</div>
            </>
          ) : (
            <>
              <div>{heroBlock}</div>
              <AttentionList items={attention} />
            </>
          )}
          <KidsProgress data={data} filter={filter} now={now} />
          <WeekAgenda data={data} filter={filter} now={now} />
          <RecommendedCourses data={data} filter={filter} />
        </div>

        <div className="flex min-w-0 flex-col gap-6 min-[1180px]:sticky min-[1180px]:top-[80px]">
          <WalletCard data={data} />
          <MessagesCard data={data} filter={filter} />
          <SetupCard data={data} />
        </div>
      </div>
    </div>
  );
}
