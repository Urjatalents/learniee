"use client";

import { useEffect, useState } from "react";

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
import { buildHomeSample } from "./homeSample";
import type { HomeData } from "./homeTypes";

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
  // Time-dependent UI renders only after mount (avoids server/client mismatch);
  // it ticks every second for the live countdown.
  const [now, setNow] = useState<Date | null>(null);
  const [data, setData] = useState<HomeData | null>(null);
  const [filter, setFilter] = useState<LearnerFilter>("all");

  useEffect(() => {
    const start = new Date();
    setNow(start);
    // Frontend-only phase: sample data, built once. The backend step replaces this
    // with the real hooks (students, enrollments, calendar, wallet, chats, courses).
    setData(buildHomeSample(start));
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now || !data) {
    return (
      <div className="mx-auto max-w-[1160px] px-4 pb-12 pt-6 sm:px-6 sm:pt-8">
        <HomeSkeleton />
      </div>
    );
  }

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
            {greeting}, <span className="text-pd-brand">{data.firstName}</span>
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
