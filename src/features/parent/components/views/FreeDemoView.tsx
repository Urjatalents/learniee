"use client";

import { useState } from "react";
import Link from "next/link";
import { Video } from "lucide-react";

import DemoRow from "@/features/parent/components/demos/DemoRow";
import DemoCouponsCard from "@/features/parent/components/demos/DemoCouponsCard";
import DemoSummaryCard from "@/features/parent/components/demos/DemoSummaryCard";
import HomeLearnerSwitcher from "@/features/parent/components/home/HomeLearnerSwitcher";
import { inKid, type LearnerFilter } from "@/features/parent/components/home/homeLogic";
import { toHomeKids } from "@/features/parent/components/my-classes/pdClassesUi";
import PdSegmented from "@/features/parent/components/PdSegmented";
import { PD_BTN_PRI, PdEmpty } from "@/features/parent/components/courses/pdUi";
import { usePdToast } from "@/features/parent/components/courses/usePdToast";
import { useDemoBookings, type DemoBookingListItem } from "@/features/parent/hooks/useDemoBookings";
import { useDemoCoupons } from "@/features/parent/hooks/useDemoCoupons";
import { useStudents } from "@/features/parent/hooks/useStudents";
import { useWalletBalance } from "@/features/parent/hooks/useWalletBalance";
import { liveDemoJoinState, useServerClock } from "@/features/shared/components/DemoJoinButton";
import ErrorBanner from "@/features/shared/components/ErrorBanner";

type DemoTab = "upcoming" | "completed";

const startMs = (b: DemoBookingListItem) =>
  b.scheduledAt ? new Date(b.scheduledAt).getTime() : new Date(b.createdAt).getTime();

/**
 * My Classes > Demos (`/parent/my-classes?tab=demos`, Parent design).
 * Upcoming / Completed demos for the chosen learner, plus the demo-coupon and
 * summary cards. Data: GET /api/parent/demo-bookings, GET /api/parent/demo-coupons,
 * GET /api/parent/wallet; "Buy extra coupon" runs the existing Razorpay coupon flow.
 */
export default function FreeDemoView() {
  const { students } = useStudents();
  const { balance, loading: couponsLoading, purchaseCoupons, purchasing } = useDemoCoupons();
  const { bookings, loading, error, meetEnabled, skewMs } = useDemoBookings();
  const { balance: walletBalance } = useWalletBalance();
  const nowMs = useServerClock(skewMs);
  const { toast, toastNode } = usePdToast();

  const [filter, setFilter] = useState<LearnerFilter>("all");
  const [tab, setTab] = useState<DemoTab>("upcoming");

  const kids = toHomeKids(students);
  const mine = bookings.filter((b) => inKid(filter, b.student.id));

  // A demo that is live right now stays "Upcoming" until its join window closes.
  const isUpcoming = (b: DemoBookingListItem) =>
    (b.status === "CONFIRMED" || b.status === "PENDING_PAYMENT") &&
    !!b.scheduledAt &&
    (new Date(b.scheduledAt).getTime() >= nowMs ||
      (b.status === "CONFIRMED" && liveDemoJoinState(b.joinWindow, nowMs) === "OPEN"));

  const upcoming = mine.filter(isUpcoming).sort((a, b) => startMs(a) - startMs(b));
  const completed = mine.filter((b) => !isUpcoming(b)).sort((a, b) => startMs(b) - startMs(a));
  const list = tab === "upcoming" ? upcoming : completed;

  const attended = mine.filter((b) => b.status === "COMPLETED").length;
  const totalBooked = mine.filter((b) => b.status !== "CANCELLED").length;
  const paidTotal = mine
    .filter((b) => b.isPaid && b.status !== "CANCELLED")
    .reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

  async function handleBuy() {
    const { message } = await purchaseCoupons(1);

    toast(message);
  }

  return (
    <div className="mt-4 grid grid-cols-1 items-start gap-6 min-[1180px]:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-6">
        <div className="mb-[18px] mt-[22px] flex flex-wrap items-center justify-between gap-3">
          <PdSegmented<DemoTab>
            label="Demo status"
            value={tab}
            onChange={setTab}
            options={[
              { value: "upcoming", label: "Upcoming", count: upcoming.length },
              { value: "completed", label: "Completed", count: completed.length },
            ]}
          />
          {/* Design: the switcher here has no "Add learner" link and no top margin. */}
          <div className="[&>div]:mt-0! [&_a]:hidden">
            <HomeLearnerSwitcher kids={kids} active={filter} onSelect={setFilter} />
          </div>
        </div>

        {error && <ErrorBanner>{error}</ErrorBanner>}

        <div className="overflow-hidden rounded-2xl border border-pd-line bg-white">
          {loading ? (
            <div aria-busy="true" aria-label="Loading" className="space-y-px">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-[72px] animate-pulse bg-[#eeeaf7]" />
              ))}
            </div>
          ) : list.length > 0 ? (
            list.map((b) => (
              <DemoRow
                key={b.id}
                booking={b}
                meetEnabled={meetEnabled}
                skewMs={skewMs}
                nowMs={nowMs}
              />
            ))
          ) : tab === "upcoming" ? (
            <PdEmpty
              icon={Video}
              title="No upcoming demos"
              text="Book a demo to meet a teacher before you enroll."
              action={
                <Link href="/parent/courses" className={PD_BTN_PRI}>
                  Find a course
                </Link>
              }
            />
          ) : (
            <PdEmpty
              icon={Video}
              title="No completed demos yet"
              text="Demos you have attended appear here."
            />
          )}
        </div>
      </div>

      <aside className="flex min-w-0 flex-col gap-6">
        <DemoCouponsCard
          loading={couponsLoading}
          remainingFree={balance?.remainingFree ?? 0}
          paidDemoPrice={balance?.paidDemoPrice ?? 100}
          walletBalance={walletBalance}
          paidTotal={paidTotal}
          buying={purchasing}
          onBuy={handleBuy}
        />
        <DemoSummaryCard upcoming={upcoming.length} attended={attended} total={totalBooked} />
      </aside>

      {toastNode}
    </div>
  );
}
