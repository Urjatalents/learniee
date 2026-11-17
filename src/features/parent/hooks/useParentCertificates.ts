"use client";

import { useCallback, useEffect, useState } from "react";

import type { CertificateView } from "@/features/shared/types/certificate";
import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";
import { isBackgroundRefresh } from "@/lib/refreshBus";

/** Every issued certificate across all of this Parent's children. */
export function useParentCertificates() {
  const [certificates, setCertificates] = useState<CertificateView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      if (!isBackgroundRefresh()) setLoading(true);
      setError("");

      const res = await fetch("/api/parent/certificates", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load certificates.");
      }

      setCertificates(data.certificates ?? []);
    } catch (err) {
      console.error("Load certificates error:", err);
      setError(err instanceof Error ? err.message : "Failed to load certificates.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useAutoRefresh(() => load(), { paths: ["/api/parent/certificates"] });

  return { certificates, loading, error, reload: load };
}
