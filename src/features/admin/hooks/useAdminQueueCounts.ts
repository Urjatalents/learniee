"use client";

import { useCallback, useEffect, useState } from "react";

import type { AdminQueueCounts } from "@/features/admin/types/queueCounts";

/**
 * Sidebar badge numbers. Best-effort: a failed request just leaves the
 * badges off, it never blocks the page behind them. Refreshes when the
 * tab regains focus so a decision made elsewhere is reflected.
 */
export function useAdminQueueCounts() {
  const [counts, setCounts] = useState<AdminQueueCounts | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/queue-counts", { cache: "no-store" });
      if (!res.ok) return;

      const data = await res.json();
      if (data?.counts) setCounts(data.counts as AdminQueueCounts);
    } catch {
      // Badges are decoration; ignore network errors.
    }
  }, []);

  useEffect(() => {
    // Initial load plus a refresh whenever the tab regains focus.
    void refresh();

    function onFocus() {
      void refresh();
    }

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  return { counts, refresh };
}
