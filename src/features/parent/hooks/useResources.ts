"use client";

import { useEffect, useState } from "react";
import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";
import { isBackgroundRefresh } from "@/lib/refreshBus";

export interface Resource {
  id: string;
  /** Learner the resource was shared for. */
  studentId: string;
  title: string;
  description: string | null;
  type: "FILE" | "LINK";
  fileKey: string | null;
  fileName: string | null;
  fileUrl: string | null;
  externalUrl: string | null;
  createdAt: string;
  enrollment?: { course: { courseTitle: string | null; subject: string | null } };
}

/**
 * Parent-side, view-only resource list. Pass an enrollmentId to
 * scope it to one course (the My Classes Resources tab); omit it to
 * get every resource ever shared with this Parent, across every
 * enrollment (the standalone /parent/resources page). Never
 * filtered by enrollment status — resources stay visible for good.
 */
export function useParentResources(enrollmentId?: string) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrollmentId]);

  useAutoRefresh(() => load(), { paths: ["/api/parent/resources"] });

  async function load() {
    try {
      if (!isBackgroundRefresh()) setLoading(true);
      setError("");

      const url = enrollmentId
        ? `/api/parent/resources?enrollmentId=${enrollmentId}`
        : "/api/parent/resources";
      const res = await fetch(url);
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
