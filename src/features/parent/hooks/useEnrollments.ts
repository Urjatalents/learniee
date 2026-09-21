"use client";

import { useEffect, useState } from "react";

import type { ParentClassSummary } from "@/features/parent/types/myClasses";

export interface ParentEnrollment {
  id: string;
  status: string;
  isLegacy: boolean;
  sessionsPerMonth: number;
  noOfMonths: number;
  monthlyRate: string;
  totalAmount: string;
  cycleStartDate: string;
  dueDate: string;
  scheduleDays: number[];
  scheduleTime: string | null;
  revisedByTeacher: boolean;
  revisionNote: string | null;
  rejectionReason: string | null;
  sessionsCompletedInCycle: number;
  cyclesCompleted: number;
  cyclePayoutStatus: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    visibleName: string | null;
  };
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
    visibleName: string | null;
  };
  course: { id: string; courseTitle: string | null };
  chatRoom: { id: string } | null;
  /**
   * Only on `/api/parent/my-classes` (Part 2C), and only for cycle-model
   * enrollments that use the My Classes page: cycle progress, next
   * class and classes waiting for the parent's confirmation.
   */
  classSummary?: ParentClassSummary | null;
}

/**
 * `endpoint` defaults to the plain enrollment list;
 * `/api/parent/my-classes` returns the same rows plus `classSummary`.
 */
export function useParentEnrollments(endpoint = "/api/parent/enrollments") {
  const [enrollments, setEnrollments] = useState<ParentEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);

      const res = await fetch(endpoint);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch enrollments");
      }

      setEnrollments(data.enrollments);
    } catch (err) {
      console.error(err);
      setError("Unable to load your enrollments.");
    } finally {
      setLoading(false);
    }
  }

  async function respondToRevision(
    enrollmentId: string,
    action: "CONFIRM" | "DECLINE",
  ) {
    try {
      const res = await fetch(
        `/api/parent/enrollments/${enrollmentId}/reconfirm`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update enrollment");
      }

      setEnrollments((current) =>
        current.map((e) => (e.id === enrollmentId ? { ...e, ...data.enrollment } : e)),
      );
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to update enrollment.");
    }
  }

  return { enrollments, loading, error, reload: load, respondToRevision };
}
