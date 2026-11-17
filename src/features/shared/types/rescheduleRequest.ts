/** Shape returned by the reschedule-request API routes (see rescheduleRequest.service.ts). */
export interface RescheduleRequestRow {
  id: string;
  classSessionId: string;
  enrollmentId: string;
  teacherId: string;
  parentId: string;
  requestedBy: "PARENT" | "TEACHER";
  status:
    | "PENDING_TEACHER_APPROVAL"
    | "PENDING_PARENT_APPROVAL"
    | "APPROVED"
    | "REJECTED"
    | "CANCELLED";
  originalScheduledDate: string;
  originalScheduledTime: string | null;
  proposedDate: string;
  proposedTime: string | null;
  reason: string | null;
  responseNote: string | null;
  respondedAt: string | null;
  createdAt: string;
  classSession: {
    id: string;
    scheduledDate: string;
    scheduledTime: string | null;
    status: string;
    /** The learner the class is for (lets the Parent page group and filter by child). */
    studentId: string;
  };
  enrollment: {
    id: string;
    subject: string | null;
    course: { id: string; courseTitle: string | null };
  };
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
    visibleName: string | null;
  };
  parent: {
    id: string;
    firstName: string;
    lastName: string;
    visibleName: string | null;
  };
}

export function displayNameFor(p: {
  firstName: string;
  lastName: string;
  visibleName: string | null;
}) {
  return p.visibleName?.trim() || `${p.firstName} ${p.lastName}`.trim();
}
