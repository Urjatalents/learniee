import Link from "next/link";
import { Download, GraduationCap } from "lucide-react";

import { PD_BTN_PRI_SM, PD_BTN_SEC_SM } from "@/features/parent/components/courses/pdUi";
import type { CertificateView } from "@/features/shared/types/certificate";

/** One issued certificate (design: Library > Certificates card). Download opens the printable page with the print dialog. */
export default function LibraryCertificateCard({ certificate }: { certificate: CertificateView }) {
  const href = `/parent/certificates/${certificate.id}`;

  return (
    <article className="flex flex-col gap-3.5 rounded-2xl border border-pd-line bg-white p-5">
      <span className="grid size-[52px] place-items-center rounded-[14px] bg-pd-b50 text-pd-brand">
        <GraduationCap size={26} />
      </span>

      <div>
        <b className="block text-base font-semibold text-pd-ink">{certificate.courseTitle}</b>
        <small className="block text-[13px] text-pd-ink3">
          {certificate.studentName} · {certificate.teacherName}
        </small>
        <small className="block text-[13px] text-pd-ink3">
          {certificate.sessionsCompleted} sessions completed
        </small>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={href} className={PD_BTN_PRI_SM}>
          View
        </Link>
        <Link href={`${href}?print=1`} className={PD_BTN_SEC_SM}>
          <Download size={14} />
          Download
        </Link>
      </div>
    </article>
  );
}
