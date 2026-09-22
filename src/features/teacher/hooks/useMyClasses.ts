"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  TeacherClassRoster,
  TeacherClassSummary,
  TeacherStudentDetailView,
} from "@/features/teacher/types/myClasses";

/** The Teacher's "My Classes" list — one card per course with students enrolled. */
export function useTeacherClasses() {
  const [classes, setClasses] = useState<TeacherClassSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (silent: boolean) => {
    try {
      if (!silent) setLoading(true);

      const res = await fetch("/api/teacher/my-classes", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load your classes.");
      }

      setClasses(data.classes);
      setError("");
    } catch (err) {
      console.error("Load teacher classes error:", err);
      setError(err instanceof Error ? err.message : "Failed to load your classes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  return { classes, loading, error, reload: () => load(true) };
}

/** One course's roster of enrolled students ("Class live" page). */
export function useTeacherClassRoster(courseId: string) {
  const [roster, setRoster] = useState<TeacherClassRoster | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async (silent: boolean) => {
      try {
        if (!silent) setLoading(true);

        const res = await fetch(`/api/teacher/my-classes/${courseId}`, { cache: "no-store" });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load this class.");
        }

        setRoster({ course: data.course, students: data.students });
        setError("");
      } catch (err) {
        console.error("Load teacher class roster error:", err);
        setError(err instanceof Error ? err.message : "Failed to load this class.");
      } finally {
        setLoading(false);
      }
    },
    [courseId],
  );

  useEffect(() => {
    if (courseId) load(false);
  }, [courseId, load]);

  return { roster, loading, error, reload: () => load(true) };
}

/** One student's classes/chat detail under a Teacher's My Classes course. */
export function useTeacherStudentDetail(courseId: string, enrollmentId: string) {
  const [detail, setDetail] = useState<TeacherStudentDetailView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async (silent: boolean) => {
      try {
        if (!silent) setLoading(true);

        const res = await fetch(`/api/teacher/my-classes/${courseId}/${enrollmentId}`, {
          cache: "no-store",
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load this student's classes.");
        }

        setDetail(data.detail);
        setError("");
      } catch (err) {
        console.error("Load teacher student detail error:", err);
        setError(err instanceof Error ? err.message : "Failed to load this student's classes.");
      } finally {
        setLoading(false);
      }
    },
    [courseId, enrollmentId],
  );

  useEffect(() => {
    if (courseId && enrollmentId) load(false);
  }, [courseId, enrollmentId, load]);

  return { detail, loading, error, reload: () => load(true) };
}
