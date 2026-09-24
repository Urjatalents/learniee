"use client";

import { useEffect, useState } from "react";

export interface AdminResource {
  id: string;
  title: string;
  description: string | null;
  type: "FILE" | "LINK";
  fileUrl: string | null;
  externalUrl: string | null;
  createdAt: string;
  teacher: { firstName: string; lastName: string; visibleName: string | null };
  parent: { firstName: string; lastName: string; visibleName: string | null };
  student: { firstName: string; lastName: string; visibleName: string | null };
  enrollment: { course: { courseTitle: string | null; subject: string | null } };
}

/**
 * Admin's "who shared what to whom" view of the Resource Library
 * (Sep 24, 2026) — every resource on the platform, newest first,
 * same read-only-oversight spirit as Chat oversight and
 * teacher-strikes. No filters UI yet (nothing else has one either);
 * the query params are there for anyone linking in from a specific
 * teacher/parent/student later.
 */
export function useAdminResources() {
  const [resources, setResources] = useState<AdminResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/resources");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load resources.");
      }

      setResources(data.resources);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unable to load resources.");
    } finally {
      setLoading(false);
    }
  }

  return { resources, loading, error, reload: load };
}
