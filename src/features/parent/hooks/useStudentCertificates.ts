"use client";

import { useCallback, useEffect, useState } from "react";

import type { CertificateView } from "@/features/shared/types/certificate";

export function useStudentCertificates(studentId: string) {
  const [certificates, setCertificates] = useState<CertificateView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/parent/students/${studentId}/certificates`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load certificates.");
      }

      setCertificates(data.certificates ?? []);
    } catch (err) {
      console.error("Load student certificates error:", err);
      setError(err instanceof Error ? err.message : "Failed to load certificates.");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  return { certificates, loading, error };
}
