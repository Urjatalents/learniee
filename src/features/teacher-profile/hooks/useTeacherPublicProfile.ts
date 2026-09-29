"use client";

import { useEffect, useState } from "react";

import type { TeacherPublicProfileResponse } from "../types";

export function useTeacherPublicProfile(teacherId: string) {
  const [data, setData] = useState<TeacherPublicProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/teacher-profiles/${teacherId}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (res.status === 404) throw new Error("This teacher profile isn't available.");
        if (!res.ok) throw new Error("Failed to load the teacher profile.");

        const json = await res.json();
        setData({ teacher: json.teacher, courses: json.courses ?? [] });
      } catch (err) {
        if (controller.signal.aborted) return;
        setData(null);
        setError(err instanceof Error ? err.message : "Unable to load the teacher profile.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();

    return () => controller.abort();
  }, [teacherId]);

  return { data, loading, error };
}
