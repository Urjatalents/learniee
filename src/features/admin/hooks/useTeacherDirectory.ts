"use client";

import { useEffect, useMemo, useState } from "react";

export interface TeacherDirectoryRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  country: string | null;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  onboardingStatus: string;
  coursesCount: number;
  activeEnrollmentsCount: number;
  createdAt: string;
}

export interface TeacherDirectorySummary {
  total: number;
  approvalStatus: { pending: number; approved: number; rejected: number };
  onboarding: { completed: number; inProgress: number };
}

export function useTeacherDirectory() {
  const [teachers, setTeachers] = useState<TeacherDirectoryRow[]>([]);
  const [summary, setSummary] = useState<TeacherDirectorySummary | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/directory/teachers");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch teacher directory");
      }

      setTeachers(data.teachers);
      setSummary(data.summary);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unable to load teachers.");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(
    () =>
      teachers.filter((t) =>
        `${t.name} ${t.email} ${t.city ?? ""}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [teachers, search],
  );

  return { teachers: filtered, summary, search, setSearch, loading, error, reload: load };
}
