"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, RefreshCw } from "lucide-react";

import PdDayList from "@/features/parent/components/calendar/PdDayList";
import PdMonthGrid from "@/features/parent/components/calendar/PdMonthGrid";
import {
  demoToEvent,
  downloadIcs,
  groupByDay,
  monthKeyOf,
  occurrenceToEvent,
  shiftMonth,
  type CalEvent,
} from "@/features/parent/components/calendar/calendarLogic";
import { usePdToast } from "@/features/parent/components/courses/usePdToast";
import { BTN_TXT, Section } from "@/features/parent/components/home/HomeBits";
import HomeLearnerSwitcher from "@/features/parent/components/home/HomeLearnerSwitcher";
import {
  dayKey,
  dayLabel,
  inKid,
  kidColor,
  type LearnerFilter,
} from "@/features/parent/components/home/homeLogic";
import { toHomeKids } from "@/features/parent/components/my-classes/pdClassesUi";
import {
  fetchParentCalendarMonth,
  useParentCalendar,
} from "@/features/parent/hooks/useCalendar";
import { useDemoBookings } from "@/features/parent/hooks/useDemoBookings";
import { useParentRescheduleRequests } from "@/features/parent/hooks/useRescheduleRequests";
import { useStudents } from "@/features/parent/hooks/useStudents";
import ErrorBanner from "@/features/shared/components/ErrorBanner";
import { isPendingOnViewer } from "@/features/shared/utils/rescheduleStatus";

const SYNC_MONTHS_AHEAD = 2;

function CalendarSkeleton() {
  const block = "animate-pulse rounded-2xl bg-[#eeeaf7]";

  return (
    <div aria-busy="true" aria-label="Loading" className="mt-5 flex flex-col gap-6 min-[1180px]:grid min-[1180px]:grid-cols-[minmax(0,1fr)_340px] min-[1180px]:items-start">
      <div className={`${block} h-[520px]`} />
      <div className="flex flex-col gap-6">
        <div className={`${block} h-14`} />
        <div className={`${block} h-48`} />
      </div>
    </div>
  );
}

/**
 * Parent Calendar: every scheduled class and demo across the children, one
 * month at a time, optionally filtered to one learner. Classes come from
 * `/api/parent/calendar`, demos from `/api/parent/demo-bookings`, and the
 * "needs your response" alert from the reschedule-request inbox.
 */
export default function CalendarView() {
  const now = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(monthKeyOf(now));
  const [selected, setSelected] = useState(dayKey(now));
  const [filter, setFilter] = useState<LearnerFilter>("all");
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");

  const { toast, toastNode } = usePdToast();
  const { students, loading: studentsLoading } = useStudents();
  const { occurrences, loading: classesLoading, error } = useParentCalendar(month);
  const { bookings, loading: demosLoading } = useDemoBookings();
  const { requests } = useParentRescheduleRequests();

  const kids = useMemo(() => toHomeKids(students), [students]);
  const needsResponse = requests.filter((r) => isPendingOnViewer(r, "PARENT")).length;

  // Everything in the visible month, for the selected learner(s).
  const events = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const all = [
      ...occurrences.map(occurrenceToEvent),
      ...bookings.map(demoToEvent),
    ].filter((e): e is CalEvent => e !== null);

    return all.filter(
      (e) =>
        e.start.getFullYear() === y &&
        e.start.getMonth() === m - 1 &&
        inKid(filter, e.studentId),
    );
  }, [occurrences, bookings, month, filter]);

  const byDay = useMemo(() => groupByDay(events), [events]);
  const colorOf = (e: CalEvent) => kidColor(kids, e.studentId);

  const [sy, sm, sd] = selected.split("-").map(Number);
  const selectedDate = new Date(sy, sm, sd);
  const dayEvents = byDay.get(selected) ?? [];

  function goToMonth(delta: number) {
    const next = shiftMonth(month, delta);
    setMonth(next);
    // Keep a valid selection: today in the current month, else the 1st.
    setSelected(next === monthKeyOf(now) ? dayKey(now) : dayKey(new Date(`${next}-01T00:00:00`)));
  }

  /** "Sync all": every upcoming class and demo from this month on, as one .ics file. */
  async function syncAll() {
    try {
      setSyncing(true);
      setSyncError("");

      const months = Array.from({ length: SYNC_MONTHS_AHEAD + 1 }, (_, i) =>
        shiftMonth(monthKeyOf(now), i),
      );
      const loaded = await Promise.all(months.map((mk) => fetchParentCalendarMonth(mk)));

      const upcoming = [...loaded.flat().map(occurrenceToEvent), ...bookings.map(demoToEvent)]
        .filter((e): e is CalEvent => e !== null)
        .filter((e) => e.state === "upcoming" && e.end.getTime() > Date.now())
        .filter((e) => inKid(filter, e.studentId))
        .sort((a, b) => a.start.getTime() - b.start.getTime());

      if (upcoming.length === 0) {
        toast("No upcoming classes to add yet");
        return;
      }

      downloadIcs(upcoming, "learniee-schedule.ics");
      toast("Calendar file downloaded");
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Could not prepare the calendar file.");
    } finally {
      setSyncing(false);
    }
  }

  const firstLoad = (classesLoading || demosLoading || studentsLoading) && events.length === 0 && occurrences.length === 0;

  return (
    <div>
      {kids.length > 0 && <HomeLearnerSwitcher kids={kids} active={filter} onSelect={setFilter} />}

      {error && (
        <div className="mt-4">
          <ErrorBanner size="compact">{error}</ErrorBanner>
        </div>
      )}
      {syncError && (
        <div className="mt-4">
          <ErrorBanner size="compact">{syncError}</ErrorBanner>
        </div>
      )}

      {firstLoad ? (
        <CalendarSkeleton />
      ) : (
        <div className="mt-6 flex flex-col gap-6 min-[1180px]:grid min-[1180px]:grid-cols-[minmax(0,1fr)_340px] min-[1180px]:items-start">
          <PdMonthGrid
            month={month}
            selected={selected}
            byDay={byDay}
            colorOf={colorOf}
            busy={classesLoading}
            legend={
              filter === "all"
                ? kids.map((k) => ({ id: k.id, first: k.first, color: kidColor(kids, k.id) }))
                : []
            }
            onSelect={setSelected}
            onPrev={() => goToMonth(-1)}
            onNext={() => goToMonth(1)}
          />

          <div className="flex min-w-0 flex-col gap-6">
            {needsResponse > 0 && (
              <Link
                href="/parent/calendar?tab=reschedule"
                className="flex w-full items-center justify-between gap-2.5 rounded-[14px] bg-pd-amber-bg px-3.5 py-3 text-left text-[13px] font-semibold text-pd-amber"
              >
                <span className="flex items-center gap-2">
                  <RefreshCw size={16} />
                  {needsResponse} reschedule{needsResponse > 1 ? "s need" : " needs"} your response
                </span>
                <b className="font-semibold text-pd-brand-d">Respond</b>
              </Link>
            )}

            <Section
              id="cal-day"
              title={
                <>
                  {dayLabel(selectedDate, now)}
                  <small className="text-xs font-medium text-pd-ink3">
                    {events.length} {events.length === 1 ? "class" : "classes"} this month
                  </small>
                </>
              }
            >
              <PdDayList events={dayEvents} colorOf={colorOf} />
            </Section>

            <button
              type="button"
              onClick={syncAll}
              disabled={syncing}
              className={`${BTN_TXT} self-start disabled:opacity-50`}
            >
              <Download size={14} />
              {syncing ? "Preparing…" : "Sync all to my calendar"}
            </button>
          </div>
        </div>
      )}

      {toastNode}
    </div>
  );
}
