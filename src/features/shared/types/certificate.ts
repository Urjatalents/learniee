/**
 * Certification (Sep 2026). Shared shapes between the server
 * (`certificate.service.ts`) and both the Teacher and Parent/Student
 * UIs, so a certificate looks the same wherever it's rendered.
 */

export type CertificateStatusValue = "ISSUED" | "DECLINED";

export interface CertificateView {
  id: string;
  certificateNumber: string;
  status: CertificateStatusValue;
  sessionsCompleted: number;
  sessionsRequired: number;
  issuedAt: string | null;
  declinedAt: string | null;
  createdAt: string;
  studentName: string;
  teacherName: string;
  courseTitle: string;
  subject: string | null;
}

export interface EligibleEnrollmentView {
  enrollmentId: string;
  studentName: string;
  courseTitle: string;
  sessionsCompleted: number;
  sessionsRequired: number;
}

export interface TeacherCertificateBoard {
  eligible: EligibleEnrollmentView[];
  decided: CertificateView[];
}
