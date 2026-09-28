import "server-only";

import { prisma } from "@/lib/prisma";
import { ComplainantRole, ComplaintDepartment, ComplaintStatus } from "@prisma/client";
import {
  notifyComplaintSubmitted,
  notifyComplaintResolved,
} from "@/features/shared/server/notificationTriggers.service";

/**
 * Parent/Teacher complaints & support (added Sep 10, 2026) — fills
 * the long-standing "Complaints: not built" gap
 * (01-PROJECT-STATUS.md §2/§4, 04-BUILD-PLAN-TIMELINE.md Week 6).
 * Modeled after `leaveRequest.service.ts`: single-step, Admin is
 * the only responder, no counter-proposal / other-party involvement
 * the way `RescheduleRequest` has.
 *
 * Lives in `features/shared/server` (not split per-role) because
 * both Parent and Teacher routes create rows here, and Admin acts
 * on the same rows — same reasoning as `leaveRequest.service.ts` /
 * `enrollmentApproval.service.ts`.
 */

export class ComplaintError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const MAX_SUBJECT_LENGTH = 150;
const MAX_DESCRIPTION_LENGTH = 2000;

export interface CreateComplaintInput {
  raiserId: string;
  raiserRole: ComplainantRole;
  subject: string;
  description: string;
  department: string;
}

/**
 * Snapshots the raiser's display name/email at submission time —
 * same reasoning as `ActivityLog.actorName`/`actorEmail` (stays
 * readable even if the account is later deleted via `/admin/users`).
 */
async function resolveRaiserIdentity(raiserId: string, raiserRole: ComplainantRole) {
  if (raiserRole === ComplainantRole.PARENT) {
    const parent = await prisma.parentProfile.findUnique({
      where: { id: raiserId },
      select: { firstName: true, lastName: true, visibleName: true, email: true },
    });

    if (!parent) return { name: null, email: null };

    return {
      name: parent.visibleName || `${parent.firstName} ${parent.lastName}`.trim(),
      email: parent.email,
    };
  }

  const teacher = await prisma.teacher.findUnique({
    where: { id: raiserId },
    select: { firstName: true, lastName: true, visibleName: true, email: true },
  });

  if (!teacher) return { name: null, email: null };

  return {
    name: teacher.visibleName || `${teacher.firstName} ${teacher.lastName}`.trim(),
    email: teacher.email,
  };
}

/**
 * Parent or Teacher raises a new complaint, OPEN until Admin
 * responds. No limit today on how many a raiser can have open at
 * once — same "no dedupe" stance `leaveRequest.service.ts` takes.
 */
export async function createComplaint(input: CreateComplaintInput) {
  const subject = input.subject?.trim() ?? "";
  const description = input.description?.trim() ?? "";

  if (!subject) {
    throw new ComplaintError("A subject is required.");
  }

  if (subject.length > MAX_SUBJECT_LENGTH) {
    throw new ComplaintError(`Subject must be ${MAX_SUBJECT_LENGTH} characters or fewer.`);
  }

  if (!description) {
    throw new ComplaintError("Please describe the issue.");
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    throw new ComplaintError(
      `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`,
    );
  }

  const department = Object.values(ComplaintDepartment).find((d) => d === input.department);

  if (!department) {
    throw new ComplaintError("Please choose which department this is for.");
  }

  const identity = await resolveRaiserIdentity(input.raiserId, input.raiserRole);

  const created = await prisma.complaint.create({
    data: {
      raiserId: input.raiserId,
      raiserRole: input.raiserRole,
      raiserName: identity.name,
      raiserEmail: identity.email,
      subject,
      description,
      department,
      status: ComplaintStatus.OPEN,
    },
  });

  await notifyComplaintSubmitted({
    raiserRole: input.raiserRole,
    raiserName: identity.name,
    subject,
    department,
  });

  return created;
}

/** Every complaint this Parent/Teacher has raised, newest first. */
export function listComplaintsForRaiser(raiserId: string, raiserRole: ComplainantRole) {
  return prisma.complaint.findMany({
    where: { raiserId, raiserRole },
    orderBy: { createdAt: "desc" },
  });
}

/** Every complaint across both roles, newest first — Admin's full view. */
export function listComplaintsForAdmin() {
  return prisma.complaint.findMany({
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Complaints addressed to one department, newest first. Department staff
 * (Accounts/HR/IT) only ever get this list, so they can't see other
 * departments' complaints or ones with no department (Admin only).
 */
export function listComplaintsForDepartment(department: ComplaintDepartment) {
  return prisma.complaint.findMany({
    where: { department },
    orderBy: { createdAt: "desc" },
  });
}

export interface RespondToComplaintInput {
  complaintId: string;
  /** When set, the complaint must belong to this department (staff scope). Omit for Admin. */
  scopeDepartment?: ComplaintDepartment;
  status: "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  adminNote?: string | null;
}

/**
 * Admin moves a complaint along the status ladder. Unlike
 * LeaveRequest's strict one-shot approve/reject, this isn't
 * terminal after a single PATCH — OPEN -> IN_PROGRESS is just a
 * status update Admin can follow up with RESOLVED/CLOSED later.
 * Only RESOLVED/CLOSED are actually terminal (blocked from further
 * changes) and stamp `resolvedAt`.
 */
export async function respondToComplaint(input: RespondToComplaintInput) {
  const complaint = await prisma.complaint.findUnique({
    where: { id: input.complaintId },
  });

  // A complaint outside the caller's department is reported as not found
  // so its existence isn't leaked to other departments.
  if (!complaint || (input.scopeDepartment && complaint.department !== input.scopeDepartment)) {
    throw new ComplaintError("Complaint not found.", 404);
  }

  if (
    complaint.status === ComplaintStatus.RESOLVED ||
    complaint.status === ComplaintStatus.CLOSED
  ) {
    throw new ComplaintError("This complaint is already resolved/closed.", 409);
  }

  const nextStatus = ComplaintStatus[input.status];
  const isTerminal =
    nextStatus === ComplaintStatus.RESOLVED || nextStatus === ComplaintStatus.CLOSED;

  const updated = await prisma.complaint.update({
    where: { id: complaint.id },
    data: {
      status: nextStatus,
      adminNote: input.adminNote?.trim() || complaint.adminNote,
      resolvedAt: isTerminal ? new Date() : null,
    },
  });

  await notifyComplaintResolved({
    raiserId: complaint.raiserId,
    raiserRole: complaint.raiserRole,
    status: nextStatus,
  });

  return updated;
}
