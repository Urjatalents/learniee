"use client";

import { useEffect, useState } from "react";

import type { SessionStatusValue } from "@/features/shared/utils/sessionOutcome";

export interface ClassSessionRow {
  id: string;
  scheduledDate: string;
  scheduledTime: string | null;
  status: SessionStatusValue;
  /** Set on cycle-model sessions (Part 1B) — those are never marked complete by hand. */
  cycleId?: string | null;
  /** Cycle-model sessions only: "class 3" of the cycle, and the real start/end instants (ISO). */
  sessionNumber?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
}

/**
 * Loads (and lets the Teacher mark complete) the real, dated
 * `ClassSession` rows for one enrollment — backs the expandable
 * "Sessions" list on `EnrollmentApprovalCard`. Only fetches once
 * `enabled` is true (the list is collapsed by default), so viewing
 * the enrollments page doesn't fire one request per active
 * enrollment.
 */
export function useEnrollmentSessions(enrollmentId: string, enabled: boolean) {
  const [sessions, setSessions] = useState<ClassSessionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [markingId, setMarkingId] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, enrollmentId]);

  async function load() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/teacher/enrollments/${enrollmentId}/sessions`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load sessions.");
      }

      setSessions(data.sessions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions.");
    } finally {
      setLoading(false);
    }
  }

  async function markComplete(sessionId: string) {
    try {
      setMarkingId(sessionId);
      setError("");

      const res = await fetch(`/api/teacher/class-sessions/${sessionId}/complete`, {
        method: "PATCH",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to mark this session complete.");
      }

      setSessions((current) =>
        current.map((s) => (s.id === sessionId ? { ...s, status: "COMPLETED" } : s)),
      );

      return data.enrollment;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark this session complete.");
      return null;
    } finally {
      setMarkingId(null);
    }
  }

  return { sessions, loading, error, markingId, markComplete };
}
