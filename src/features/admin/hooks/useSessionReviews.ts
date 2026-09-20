"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  SessionReviewItem,
  SessionReviewListing,
} from "@/features/shared/types/sessionReview";

/**
 * Admin's class-review queue (Part 2A): classes a parent reported
 * and classes that ran for under half their time, plus the ones
 * Admin decided recently. `decide` saves a decision (or override) and
 * reloads the lists; the server's warnings are returned so the page
 * can show them.
 */
export function useSessionReviews() {
  const [open, setOpen] = useState<SessionReviewItem[]>([]);
  const [decided, setDecided] = useState<SessionReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/admin/session-reviews");
      const data: Partial<SessionReviewListing> & { error?: string } = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load the class reviews.");
      }

      setOpen(data.open ?? []);
      setDecided(data.decided ?? []);
      setError("");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unable to load the class reviews.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(input: {
    sessionId: string;
    status: string;
    expectedStatus: string;
    reason: string;
  }): Promise<{ ok: boolean; error?: string; warnings: string[] }> {
    try {
      const res = await fetch(`/api/admin/session-reviews/${input.sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: input.status,
          expectedStatus: input.expectedStatus,
          reason: input.reason,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        // A stale page: reload so Admin sees the current state.
        if (res.status === 409) await load();

        return { ok: false, error: data.error || "Failed to save this decision.", warnings: [] };
      }

      await load();

      return { ok: true, warnings: Array.isArray(data.warnings) ? data.warnings : [] };
    } catch (err) {
      console.error(err);

      return { ok: false, error: "Failed to save this decision.", warnings: [] };
    }
  }

  return { open, decided, loading, error, decide, reload: load };
}
