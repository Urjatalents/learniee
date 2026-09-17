"use client";

import { useEffect, useMemo, useState } from "react";

export interface ParentDirectoryRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  country: string | null;
  onboardingComplete: boolean;
  studentsCount: number;
  activeEnrollmentsCount: number;
  walletBalance: number;
  createdAt: string;
}

export interface ParentDirectorySummary {
  total: number;
  onboarding: { completed: number; inProgress: number };
}

export function useParentDirectory() {
  const [parents, setParents] = useState<ParentDirectoryRow[]>([]);
  const [summary, setSummary] = useState<ParentDirectorySummary | null>(null);
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

      const res = await fetch("/api/admin/directory/parents");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch parent directory");
      }

      setParents(data.parents);
      setSummary(data.summary);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unable to load parents.");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(
    () =>
      parents.filter((p) =>
        `${p.name} ${p.email} ${p.city ?? ""}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [parents, search],
  );

  return { parents: filtered, summary, search, setSearch, loading, error, reload: load };
}
