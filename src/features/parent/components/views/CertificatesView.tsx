"use client";

import { GraduationCap } from "lucide-react";

import { PdEmpty } from "@/features/parent/components/courses/pdUi";
import LibraryCertificateCard from "@/features/parent/components/library/LibraryCertificateCard";
import { useParentCertificates } from "@/features/parent/hooks/useParentCertificates";
import ErrorBanner from "@/features/shared/components/ErrorBanner";

/** "Certificates" tab of My Classes: same cards as the Library page, one per issued certificate. */
export default function CertificatesView() {
  const { certificates, loading, error } = useParentCertificates();

  return (
    <div className="mt-6">
      {error && <ErrorBanner size="compact">{error}</ErrorBanner>}

      {loading ? (
        <div aria-busy="true" aria-label="Loading" className="h-40 animate-pulse rounded-2xl bg-[#eeeaf7]" />
      ) : certificates.length ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {certificates.map((c) => (
            <LibraryCertificateCard key={c.id} certificate={c} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-pd-line bg-white p-5">
          <PdEmpty
            icon={GraduationCap}
            title="No certificates yet"
            text="Certificates your children earn appear here once a teacher issues them."
          />
        </div>
      )}
    </div>
  );
}
