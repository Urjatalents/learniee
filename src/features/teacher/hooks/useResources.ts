"use client";

import { useEffect, useState } from "react";

export interface Resource {
  id: string;
  title: string;
  description: string | null;
  type: "FILE" | "LINK";
  fileKey: string | null;
  fileName: string | null;
  fileUrl: string | null;
  externalUrl: string | null;
  createdAt: string;
}

/** Teacher-side resource list + share/delete for one enrollment. */
export function useTeacherResources(enrollmentId: string) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (enrollmentId) load();
  }, [enrollmentId]);

  async function load() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/teacher/resources?enrollmentId=${enrollmentId}`);
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

  async function share(input: {
    title: string;
    description?: string;
    type: "FILE" | "LINK";
    fileKey?: string;
    fileName?: string;
    externalUrl?: string;
  }) {
    setError("");

    const res = await fetch("/api/teacher/resources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrollmentId, ...input }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to share resource.");
      return false;
    }

    await load();
    return true;
  }

  async function remove(resourceId: string) {
    setError("");

    const res = await fetch(`/api/teacher/resources/${resourceId}`, { method: "DELETE" });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to delete resource.");
      return false;
    }

    await load();
    return true;
  }

  return { resources, loading, error, share, remove, reload: load };
}
