"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  AdminTeacherSummary,
  TeacherApprovalCounts,
  TeacherApprovalState,
} from "@/features/admin/types/teacher";

const EMPTY_COUNTS: TeacherApprovalCounts = { PENDING: 0, APPROVED: 0, REJECTED: 0 };

/** Lists teacher applications for one status tab, plus the count for every tab. */
export function useTeachersList(status: TeacherApprovalState) {
  const [teachers, setTeachers] = useState<AdminTeacherSummary[]>([]);
  const [counts, setCounts] = useState<TeacherApprovalCounts>(EMPTY_COUNTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTeachers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/admin/teachers?status=${status}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch teachers");
      }

      const data = await res.json();
      setTeachers(data.teachers);
      setCounts(data.counts);
    } catch (err) {
      console.error(err);
      setError("Unable to load teachers.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  return { teachers, counts, loading, error, refetch: fetchTeachers };
}
