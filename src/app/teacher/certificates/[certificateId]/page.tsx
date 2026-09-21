"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";

import type { CertificateView } from "@/features/shared/types/certificate";
import CertificateDocument from "@/features/shared/components/CertificateDocument";
import ErrorBanner from "@/features/shared/components/ErrorBanner";

/** Teacher's read-only preview of a certificate they issued — same print pattern as the Parent view. */
export default function TeacherCertificateDetailPage() {
  const { certificateId } = useParams<{ certificateId: string }>();
  const router = useRouter();

  const [certificate, setCertificate] = useState<CertificateView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/teacher/certificates/${certificateId}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch this certificate");
        }

        if (!cancelled) setCertificate(data.certificate);
      } catch (err) {
        console.error(err);
        if (!cancelled) setError("Unable to load this certificate.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [certificateId]);

  return (
    <div className="p-6 max-w-3xl mx-auto print:p-0 print:max-w-none">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <button
          type="button"
          onClick={() => router.push("/teacher/certificates")}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={16} /> Back to Certificates
        </button>

        {certificate && (
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1 text-sm bg-brand text-white px-4 py-2 rounded-full font-medium hover:bg-brand-dark"
          >
            <Printer size={15} /> Print / Save as PDF
          </button>
        )}
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {loading ? (
        <p className="text-gray-500 text-center py-8">Loading…</p>
      ) : certificate ? (
        <CertificateDocument certificate={certificate} />
      ) : null}
    </div>
  );
}
