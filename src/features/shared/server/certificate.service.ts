import "server-only";

import { prisma } from "@/lib/prisma";
import { CertificateStatus, ClassSessionStatus, EnrollmentStatus } from "@prisma/client";

import { COUNTED_SESSION_STATUSES } from "@/features/shared/utils/sessionOutcome";
import { notifyCertificateIssued } from "@/features/shared/server/notificationTriggers.service";
import { logActivity } from "@/features/shared/server/activityLog.service";
import type {
  CertificateView,
  EligibleEnrollmentView,
  TeacherCertificateBoard,
} from "@/features/shared/types/certificate";

/**
 * Certification (Sep 2026). A Course opts in
 * (`certificateEnabled` + `certificateSessionThreshold`); once an
 * Enrollment in that course has reached that many *counted* sessions
 * — the same "counted" definition TCC already uses
 * (`COUNTED_SESSION_STATUSES`: COMPLETED / STUDENT_NO_SHOW /
 * CANCELLED_LATE, see sessionOutcome.ts) — it shows up in the
 * Teacher's Certification tab for a decision. The count is always
 * computed live, never cached (same rule as cycle progress
 * elsewhere in this codebase — see 03-DATA-MODEL.md).
 *
 * A `Certificate` row is written only once the Teacher decides
 * (ISSUED or DECLINED); the decision is final in this pass — no
 * reissue/reconsider flow. Only ISSUED certificates are ever visible
 * to a Parent/Student.
 */

const COUNTED_STATUSES = [...COUNTED_SESSION_STATUSES] as ClassSessionStatus[];

async function countCompletedSessions(enrollmentId: string): Promise<number> {
  return prisma.classSession.count({
    where: { enrollmentId, status: { in: COUNTED_STATUSES } },
  });
}

/** Short, stable, human-facing certificate number derived from the row's own id — no extra column needed. */
function certificateNumberFor(certificateId: string): string {
  return `LRN-CERT-${certificateId.replace(/-/g, "").slice(0, 10).toUpperCase()}`;
}

const certificateInclude = {
  student: { select: { firstName: true, lastName: true, visibleName: true } },
  teacher: { select: { firstName: true, lastName: true, visibleName: true } },
  course: { select: { courseTitle: true, subject: true } },
} as const;

type CertificateRow = {
  id: string;
  status: CertificateStatus;
  sessionsCompleted: number;
  sessionsRequired: number;
  issuedAt: Date | null;
  declinedAt: Date | null;
  createdAt: Date;
  student: { firstName: string; lastName: string; visibleName: string | null };
  teacher: { firstName: string; lastName: string; visibleName: string | null };
  course: { courseTitle: string | null; subject: string | null };
};

function shapeCertificate(row: CertificateRow): CertificateView {
  return {
    id: row.id,
    certificateNumber: certificateNumberFor(row.id),
    status: row.status,
    sessionsCompleted: row.sessionsCompleted,
    sessionsRequired: row.sessionsRequired,
    issuedAt: row.issuedAt ? row.issuedAt.toISOString() : null,
    declinedAt: row.declinedAt ? row.declinedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    studentName: row.student.visibleName || `${row.student.firstName} ${row.student.lastName}`,
    teacherName: row.teacher.visibleName || `${row.teacher.firstName} ${row.teacher.lastName}`,
    courseTitle: row.course.courseTitle || "Course",
    subject: row.course.subject,
  };
}

export class CertificateActionError extends Error {}

/** Teacher's Certification tab: enrollments ready for a decision, plus every past decision. */
export async function getTeacherCertificateBoard(
  teacherId: string,
): Promise<TeacherCertificateBoard> {
  const candidates = await prisma.enrollment.findMany({
    where: {
      teacherId,
      status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
      certificate: null,
      course: {
        certificateEnabled: true,
        certificateSessionThreshold: { not: null },
      },
    },
    select: {
      id: true,
      student: { select: { firstName: true, lastName: true, visibleName: true } },
      course: { select: { courseTitle: true, certificateSessionThreshold: true } },
    },
  });

  const eligible: EligibleEnrollmentView[] = [];

  for (const enrollment of candidates) {
    const threshold = enrollment.course.certificateSessionThreshold;
    if (!threshold) continue;

    const sessionsCompleted = await countCompletedSessions(enrollment.id);
    if (sessionsCompleted < threshold) continue;

    eligible.push({
      enrollmentId: enrollment.id,
      studentName:
        enrollment.student.visibleName ||
        `${enrollment.student.firstName} ${enrollment.student.lastName}`,
      courseTitle: enrollment.course.courseTitle || "Course",
      sessionsCompleted,
      sessionsRequired: threshold,
    });
  }

  const decidedRows = await prisma.certificate.findMany({
    where: { teacherId },
    orderBy: { createdAt: "desc" },
    include: certificateInclude,
  });

  return { eligible, decided: decidedRows.map(shapeCertificate) };
}

/** Teacher issues or declines a certificate for one of their enrollments. Final — no re-decision. */
export async function decideCertificate(
  teacherId: string,
  enrollmentId: string,
  action: "issue" | "decline",
): Promise<CertificateView> {
  const enrollment = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, teacherId },
    select: {
      id: true,
      studentId: true,
      parentId: true,
      courseId: true,
      certificate: { select: { id: true } },
      course: { select: { certificateEnabled: true, certificateSessionThreshold: true } },
    },
  });

  if (!enrollment) {
    throw new CertificateActionError("Enrollment not found.");
  }

  if (enrollment.certificate) {
    throw new CertificateActionError(
      "A certificate decision has already been made for this enrollment.",
    );
  }

  if (!enrollment.course.certificateEnabled || !enrollment.course.certificateSessionThreshold) {
    throw new CertificateActionError("This course does not have certification enabled.");
  }

  const sessionsCompleted = await countCompletedSessions(enrollment.id);

  if (sessionsCompleted < enrollment.course.certificateSessionThreshold) {
    throw new CertificateActionError("This student hasn't completed enough sessions yet.");
  }

  const status = action === "issue" ? CertificateStatus.ISSUED : CertificateStatus.DECLINED;
  const now = new Date();

  const created = await prisma.certificate.create({
    data: {
      enrollmentId: enrollment.id,
      studentId: enrollment.studentId,
      teacherId,
      parentId: enrollment.parentId,
      courseId: enrollment.courseId,
      status,
      sessionsCompleted,
      sessionsRequired: enrollment.course.certificateSessionThreshold,
      issuedAt: status === CertificateStatus.ISSUED ? now : null,
      declinedAt: status === CertificateStatus.DECLINED ? now : null,
    },
    include: certificateInclude,
  });

  if (status === CertificateStatus.ISSUED) {
    await notifyCertificateIssued(enrollment.id);

    await logActivity({
      action: "CERTIFICATE_ISSUED",
      actorRole: "TEACHER",
      actorId: teacherId,
      description: `Certificate issued for enrollment ${enrollment.id}.`,
      metadata: { enrollmentId: enrollment.id, certificateId: created.id },
    });
  }

  return shapeCertificate(created);
}

/** Single certificate, scoped to the teacher who decided it (for their printable/preview page). */
export async function getCertificateForTeacher(
  teacherId: string,
  certificateId: string,
): Promise<CertificateView | null> {
  const row = await prisma.certificate.findFirst({
    where: { id: certificateId, teacherId, status: CertificateStatus.ISSUED },
    include: certificateInclude,
  });

  return row ? shapeCertificate(row) : null;
}

/** Certificates issued for one Student, scoped to their parent. Returns null if the student isn't theirs. */
export async function getCertificatesForStudent(
  parentId: string,
  studentId: string,
): Promise<CertificateView[] | null> {
  const student = await prisma.student.findFirst({
    where: { id: studentId, parentId },
    select: { id: true },
  });

  if (!student) return null;

  const rows = await prisma.certificate.findMany({
    where: { studentId, status: CertificateStatus.ISSUED },
    orderBy: { issuedAt: "desc" },
    include: certificateInclude,
  });

  return rows.map(shapeCertificate);
}

/** Single certificate, scoped to the parent of the student it belongs to (for download). */
export async function getCertificateForParent(
  parentId: string,
  certificateId: string,
): Promise<CertificateView | null> {
  const row = await prisma.certificate.findFirst({
    where: { id: certificateId, parentId, status: CertificateStatus.ISSUED },
    include: certificateInclude,
  });

  return row ? shapeCertificate(row) : null;
}
