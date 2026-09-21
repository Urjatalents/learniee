import { COMPANY_INFO } from "@/lib/companyInfo";
import type { CertificateView } from "@/features/shared/types/certificate";

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/**
 * The certificate itself — shared between `/teacher/certificates/[id]`
 * and `/parent/certificates/[id]` so it looks identical wherever it's
 * viewed. "Download" is `window.print()` (Save as PDF), the same
 * zero-dependency pattern already used for Invoices
 * (`parent/payments/[invoiceId]/page.tsx`) — no PDF-generation
 * library needed.
 */
export default function CertificateDocument({ certificate }: { certificate: CertificateView }) {
  return (
    <div className="bg-white border-[10px] border-double border-brand/40 rounded-lg shadow-sm print:border-brand/60 print:shadow-none px-8 sm:px-16 py-12 text-center font-sans text-gray-900">
      <p className="text-xs uppercase tracking-[0.3em] text-gray-400">{COMPANY_INFO.legalName}</p>
      <h1 className="mt-4 text-3xl sm:text-4xl font-heading font-bold text-gray-900">
        Certificate of Completion
      </h1>
      <p className="mt-6 text-sm text-gray-500">This certifies that</p>
      <p className="mt-2 text-2xl sm:text-3xl font-semibold text-brand">
        {certificate.studentName}
      </p>
      <p className="mt-6 text-sm text-gray-500 max-w-lg mx-auto leading-relaxed">
        has successfully completed{" "}
        <span className="font-medium text-gray-800">
          {certificate.sessionsCompleted} sessions
        </span>{" "}
        of the course
      </p>
      <p className="mt-2 text-xl font-semibold text-gray-800">{certificate.courseTitle}</p>
      {certificate.subject && (
        <p className="text-sm text-gray-500">{certificate.subject}</p>
      )}

      <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-gray-200 pt-6 text-left">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Instructor</p>
          <p className="text-sm font-medium text-gray-800">{certificate.teacherName}</p>
        </div>
        <div className="sm:text-right">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Date issued</p>
          <p className="text-sm font-medium text-gray-800">
            {certificate.issuedAt ? dateFmt.format(new Date(certificate.issuedAt)) : "—"}
          </p>
        </div>
      </div>

      <p className="mt-8 text-xs text-gray-400 font-mono">
        Certificate No. {certificate.certificateNumber}
      </p>
    </div>
  );
}
