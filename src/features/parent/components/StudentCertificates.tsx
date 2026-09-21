"use client";

import Link from "next/link";
import { Award, Download } from "lucide-react";

import { useStudentCertificates } from "@/features/parent/hooks/useStudentCertificates";

/**
 * Certification (Sep 2026) — shown on the Student's own profile page
 * so a parent can see and download every certificate their child has
 * been awarded. Only ISSUED certificates ever show up here (declined
 * ones stay teacher-side only).
 */
export default function StudentCertificates({ studentId }: { studentId: string }) {
  const { certificates, loading, error } = useStudentCertificates(studentId);

  if (loading) return null;
  if (error || certificates.length === 0) return null;

  return (
    <div className="bg-white border rounded-2xl p-6 mb-8">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
        Certificates
      </h2>

      <div className="space-y-3">
        {certificates.map((cert) => (
          <div
            key={cert.id}
            className="flex items-center justify-between gap-3 border border-gray-100 rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
                <Award size={18} />
              </span>
              <div>
                <p className="text-sm font-medium text-gray-800">{cert.courseTitle}</p>
                <p className="text-xs text-gray-400">
                  {cert.teacherName} · {cert.sessionsCompleted} sessions completed
                </p>
              </div>
            </div>

            <Link
              href={`/parent/certificates/${cert.id}`}
              className="inline-flex items-center gap-1 text-sm text-brand shrink-0"
            >
              <Download size={15} /> View
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
