"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  CertificateView,
  EligibleEnrollmentView,
} from "@/features/shared/types/certificate";

export function useTeacherCertificates() {
  const [eligible, setEligible] = useState<EligibleEnrollmentView[]>([]);
  const [decided, setDecided] = useState<CertificateView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/teacher/certificates", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load certificates.");
      }

      setEligible(data.eligible ?? []);
      setDecided(data.decided ?? []);
    } catch (err) {
      console.error("Load teacher certificates error:", err);
      setError(err instanceof Error ? err.message : "Failed to load certificates.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(enrollmentId: string, action: "issue" | "decline") {
    try {
      setDecidingId(enrollmentId);
      setError("");

      const res = await fetch(`/api/teacher/certificates/${enrollmentId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to record the decision.");
      }

      await load();
      return true;
    } catch (err) {
      console.error("Certificate decision error:", err);
      setError(err instanceof Error ? err.message : "Failed to record the decision.");
      return false;
    } finally {
      setDecidingId(null);
    }
  }

  return { eligible, decided, loading, error, decidingId, decide };
}
