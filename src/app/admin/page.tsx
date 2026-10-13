"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import DashboardActivity from "@/features/admin/components/DashboardActivity";
import { useAdminCounts } from "@/features/admin/components/ui/AdminCountsContext";
import {
  AdminPanel,
  AdminSectionTitle,
} from "@/features/admin/components/ui/primitives";
import {
  ADMIN_NAV_ITEMS,
  type AdminCountKey,
  type AdminNavItem,
} from "@/features/admin/config/adminNav";

interface QueueDef {
  countKey: AdminCountKey;
  note: string;
}

// Four queues that get the large cards. Order is the order Admin sees.
const PRIORITY: QueueDef[] = [
  { countKey: "teachers", note: "Teachers waiting for approval" },
  { countKey: "refunds", note: "Parents asking for a wallet credit" },
  { countKey: "payouts", note: "Held or rejected by Accounts" },
  { countKey: "chatReports", note: "Flagged by a parent or teacher" },
];

const OTHER: QueueDef[] = [
  { countKey: "courses", note: "Courses teachers have submitted for review" },
  { countKey: "enrollments", note: "Enrollments the teacher has already approved" },
  { countKey: "classReviews", note: "Reported classes and ones that need an outcome" },
  { countKey: "complaints", note: "Parent and teacher issues awaiting a response" },
  { countKey: "leave", note: "Teacher leave to approve or reject" },
  { countKey: "classRequests", note: "Custom classes parents asked for" },
  { countKey: "bankAccounts", note: "Teacher payout bank details to approve" },
  { countKey: "strikes", note: "Recent missed or late-cancelled classes, waive if needed" },
  { countKey: "blogs", note: "Teacher posts to review before they go live" },
];

function itemFor(key: AdminCountKey): AdminNavItem {
  const item = ADMIN_NAV_ITEMS.find((candidate) => candidate.countKey === key);

  if (!item) throw new Error(`No admin nav item for count key "${key}"`);

  return item;
}

function greeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function AdminDashboard() {
  const { counts } = useAdminCounts();

  const queueCount = PRIORITY.length + OTHER.length;
  const totalWaiting = counts
    ? [...PRIORITY, ...OTHER].reduce((sum, queue) => sum + counts[queue.countKey], 0)
    : null;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-heading text-3xl font-bold leading-tight sm:text-4xl">
          <span suppressHydrationWarning>{greeting()}</span>, Admin
        </h1>
        <p className="text-[17px] text-admin-muted">
          {totalWaiting === null
            ? "Checking what is waiting for you…"
            : `${totalWaiting} ${totalWaiting === 1 ? "item is" : "items are"} waiting for a decision across ${queueCount} queues.`}
        </p>
      </div>

      <section aria-labelledby="h-review" className="flex flex-col gap-3.5">
        <AdminSectionTitle id="h-review">Needs your review first</AdminSectionTitle>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-4">
          {PRIORITY.map((queue) => {
            const item = itemFor(queue.countKey);
            const Icon = item.icon;

            return (
              <Link
                key={queue.countKey}
                href={item.href}
                className="flex flex-col gap-4 rounded-[18px] border border-admin-line bg-white p-5 transition hover:border-[#c9a8fa] hover:shadow-[0_6px_18px_rgba(126,43,241,0.10)]"
              >
                <div className="flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-[13px] bg-admin-tint text-brand-dark">
                    <Icon className="size-[22px]" aria-hidden="true" />
                  </span>
                  <span className="font-heading text-[44px] font-extrabold leading-none">
                    {counts ? counts[queue.countKey] : "–"}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[17px] font-extrabold">{item.label}</span>
                  <span className="text-sm text-admin-muted">{queue.note}</span>
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-extrabold text-brand-dark">
                  Open queue
                  <ChevronRight className="size-4" aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="flex flex-wrap items-start gap-6">
        <section
          aria-labelledby="h-queues"
          className="flex min-w-0 basis-[460px] flex-[999_1_460px] flex-col gap-3.5"
        >
          <AdminSectionTitle id="h-queues">Other queues</AdminSectionTitle>

          <AdminPanel className="flex flex-col overflow-hidden">
            {OTHER.map((queue, index) => {
              const item = itemFor(queue.countKey);
              const Icon = item.icon;

              return (
                <Link
                  key={queue.countKey}
                  href={item.href}
                  className={`flex min-h-11 items-center gap-3.5 px-5 py-3.5 hover:bg-admin-hover ${
                    index > 0 ? "border-t border-admin-line-soft" : ""
                  }`}
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-admin-surface text-brand-dark">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-base font-extrabold">{item.label}</span>
                    <span className="text-sm text-admin-muted">{queue.note}</span>
                  </span>
                  <span className="min-w-7 shrink-0 rounded-full bg-admin-tint px-2.5 py-[3px] text-center text-sm font-extrabold text-brand-dark">
                    {counts ? counts[queue.countKey] : "–"}
                  </span>
                  <ChevronRight className="size-[18px] shrink-0 text-admin-muted" aria-hidden="true" />
                </Link>
              );
            })}
          </AdminPanel>
        </section>

        <div className="min-w-0 basis-[300px] flex-1">
          <DashboardActivity />
        </div>
      </div>
    </div>
  );
}
