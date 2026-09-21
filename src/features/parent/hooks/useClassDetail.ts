"use client";

import { useCallback, useEffect, useState } from "react";

import type { ClassDetailView } from "@/features/parent/types/myClasses";

/**
 * Loads one enrollment's My Classes page (Part 2C). `reload` refreshes
 * quietly — without the loading state — so the page doesn't flash
 * after a class ends, an "All good" is tapped, or a renewal is paid.
 */
export function useClassDetail(enrollmentId: string) {
  const [detail, setDetail] = useState<ClassDetailView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async (silent: boolean) => {
      try {
        if (!silent) setLoading(true);

        const res = await fetch(`/api/parent/my-classes/${enrollmentId}`, {
          cache: "no-store",
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load this class.");
        }

        setDetail(data.detail);
        setError("");
      } catch (err) {
        console.error("Load class detail error:", err);
        setError(err instanceof Error ? err.message : "Failed to load this class.");
      } finally {
        setLoading(false);
      }
    },
    [enrollmentId],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const reload = useCallback(() => load(true), [load]);

  return { detail, loading, error, reload };
}
