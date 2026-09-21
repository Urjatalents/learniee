"use client";

import Link from "next/link";
import { Award, CheckCircle2, XCircle } from "lucide-react";

import { useTeacherCertificates } from "@/features/teacher/hooks/useTeacherCertificates";
import ErrorBanner from "@/features/shared/components/ErrorBanner";

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/**
 * Certification (Sep 2026). Fills the "Certificate Management" nav
 * slot that already existed in TeacherSidebar. Two sections:
 * enrollments that have hit their course's session threshold and
 * need a decision, then a history of everything already decided.
 * The decision is final in this pass — no reissue/reconsider action.
 */
export default function TeacherCertificatesPage() {
  const { eligible, decided, loading, error, decidingId, decide } = useTeacherCertificates();

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
          <Award size={20} />
        </span>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Certificate Management</h1>
          <p className="text-sm text-gray-500">
            Allot certificates once a student completes the required sessions.
          </p>
        </div>
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {loading ? (
        <p className="text-gray-500 text-center py-8">Loading…</p>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Ready for a decision
            </h2>

            {eligible.length === 0 ? (
              <p className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-xl p-4">
                No enrollments are waiting on a certificate decision right now.
              </p>
            ) : (
              <div className="space-y-3">
                {eligible.map((row) => (
                  <div
                    key={row.enrollmentId}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-gray-200 rounded-xl p-4"
                  >
                    <div>
                      <p className="font-medium text-gray-800">{row.studentName}</p>
                      <p className="text-sm text-gray-500">{row.courseTitle}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {row.sessionsCompleted} of {row.sessionsRequired} sessions completed
                      </p>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={decidingId === row.enrollmentId}
                        onClick={() => decide(row.enrollmentId, "issue")}
                        className="inline-flex items-center gap-1 text-sm bg-brand text-white px-3 py-2 rounded-full font-medium hover:bg-brand-dark disabled:opacity-60"
                      >
                        <CheckCircle2 size={15} /> Allot certificate
                      </button>
                      <button
                        type="button"
                        disabled={decidingId === row.enrollmentId}
                        onClick={() => decide(row.enrollmentId, "decline")}
                        className="inline-flex items-center gap-1 text-sm border border-gray-300 text-gray-600 px-3 py-2 rounded-full font-medium hover:bg-gray-50 disabled:opacity-60"
                      >
                        <XCircle size={15} /> Don&apos;t issue
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              History
            </h2>

            {decided.length === 0 ? (
              <p className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-xl p-4">
                No certificate decisions yet.
              </p>
            ) : (
              <div className="border border-gray-200 rounded-xl divide-y divide-gray-100">
                {decided.map((cert) => (
                  <div
                    key={cert.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4"
                  >
                    <div>
                      <p className="font-medium text-gray-800">{cert.studentName}</p>
                      <p className="text-sm text-gray-500">{cert.courseTitle}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          cert.status === "ISSUED"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {cert.status === "ISSUED" ? "Issued" : "Declined"}
                      </span>
                      <span className="text-xs text-gray-400">
                        {dateFmt.format(new Date(cert.issuedAt || cert.declinedAt || cert.createdAt))}
                      </span>
                      {cert.status === "ISSUED" && (
                        <Link
                          href={`/teacher/certificates/${cert.id}`}
                          className="text-xs text-brand underline"
                        >
                          View
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
