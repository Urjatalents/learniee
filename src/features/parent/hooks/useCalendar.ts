"use client";

import { useEffect, useState } from "react";
import type { CalendarOccurrence } from "@/features/shared/types/calendar";
import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";
import { isBackgroundRefresh } from "@/lib/refreshBus";

export type { CalendarOccurrence };

/** One month of occurrences (GET /api/parent/calendar). `month` is "YYYY-MM". */
export async function fetchParentCalendarMonth(
  month: string,
  studentId?: string,
): Promise<CalendarOccurrence[]> {
  const params = new URLSearchParams({ month });
  if (studentId) params.set("studentId", studentId);

  const res = await fetch(`/api/parent/calendar?${params.toString()}`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to fetch calendar");
  }

  return data.occurrences;
}

/** `month` is "YYYY-MM"; `studentId` optionally scopes to one child. */
export function useParentCalendar(month: string, studentId?: string) {
  const [occurrences, setOccurrences] = useState<CalendarOccurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, studentId]);

  useAutoRefresh(() => load(), { paths: ["/api/parent/calendar"] });

  async function load() {
    try {
      if (!isBackgroundRefresh()) setLoading(true);
      setError("");

      setOccurrences(await fetchParentCalendarMonth(month, studentId));
    } catch (err) {
      console.error(err);
      setError("Unable to load the calendar.");
    } finally {
      setLoading(false);
    }
  }

  return { occurrences, loading, error, reload: load };
}
