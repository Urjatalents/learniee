"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AdminPanel, AdminSectionTitle } from "@/features/admin/components/ui/primitives";

interface ActivityItem {
  id: string;
  description: string;
  createdAt: string;
}

function timeAgo(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.round(hours / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}

/** Latest few Activity Log lines for the Overview screen. Best-effort. */
export default function DashboardActivity() {
  const [items, setItems] = useState<ActivityItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/admin/activity-logs?pageSize=5", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setItems(Array.isArray(data?.items) ? data.items : []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section aria-labelledby="h-activity" className="flex min-w-0 flex-col gap-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <AdminSectionTitle id="h-activity">Recent activity</AdminSectionTitle>
        <Link href="/admin/activity-logs" className="text-sm font-extrabold text-brand-dark hover:underline">
          Open log
        </Link>
      </div>

      <AdminPanel className="flex flex-col px-5 py-2">
        {items === null ? (
          <p role="status" className="py-4 text-[15px] text-admin-muted">
            Loading…
          </p>
        ) : items.length === 0 ? (
          <p className="py-4 text-[15px] text-admin-muted">No activity yet.</p>
        ) : (
          items.map((item, index) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 py-3.5 ${index > 0 ? "border-t border-admin-line-soft" : ""}`}
            >
              <span className="size-2.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
              <span className="min-w-0 flex-1 text-[15px] font-bold">{item.description}</span>
              <span className="shrink-0 text-[13px] text-admin-muted">{timeAgo(item.createdAt)}</span>
            </div>
          ))
        )}
      </AdminPanel>
    </section>
  );
}
