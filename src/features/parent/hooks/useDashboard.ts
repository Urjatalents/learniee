"use client";

import { useCallback, useEffect, useState } from "react";

import type { ParentDashboardData } from "@/features/parent/types/dashboard";
import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";
import { isBackgroundRefresh } from "@/lib/refreshBus";

/**
 * Loads the Parent home screen (GET /api/parent/dashboard). Refetches in the
 * background whenever something it shows changes: classes and sessions,
 * demos, homework, chat, wallet, reschedules or the children list.
 *
 * `skewMs` is the server clock minus this device's clock, so the "Starts in
 * 12m" countdown and the Join button follow the server even if the device
 * clock is wrong.
 */
export function useDashboard() {
  const [data, setData] = useState<ParentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [skewMs, setSkewMs] = useState(0);

  const reload = useCallback(async () => {
    try {
      if (!isBackgroundRefresh()) setLoading(true);
      setError("");

      const res = await fetch("/api/parent/dashboard", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.dashboard) {
        throw new Error(json.error || "Failed to load your dashboard.");
      }

      const dashboard = json.dashboard as ParentDashboardData;

      setSkewMs(new Date(dashboard.serverNow).getTime() - Date.now());
      setData(dashboard);
    } catch (err) {
      console.error("Load dashboard error:", err);
      setError(err instanceof Error ? err.message : "Failed to load your dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useAutoRefresh(() => reload(), {
    paths: [
      "/api/parent/dashboard",
      "/api/parent/calendar",
      "/api/parent/my-classes",
      "/api/parent/class-sessions",
      "/api/parent/demo-bookings",
      "/api/parent/demo-feedback",
      "/api/parent/reschedule-requests",
      "/api/parent/homework",
      "/api/parent/chat",
      "/api/parent/wallet",
      "/api/parent/students",
      "/api/parent/profile",
    ],
  });

  return { data, loading, error, skewMs, reload };
}
